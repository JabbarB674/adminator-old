/*
    MIGRATION 03: SIMPLIFY RBAC
    ---------------------------
    Removes App-Specific Roles (AppRoles) and replaces them with binary App Access.
    
    Changes:
    1. Drops Adminator_ProfileDesignations (Old mapping)
    2. Drops Adminator_AppRoles (Old roles)
    3. Creates Adminator_ProfileAppAccess (New binary mapping: Profile -> App)
    4. Updates Login Stored Procedure
*/

-- 1. Drop the Stored Procedure (will recreate at end)
DROP PROCEDURE IF EXISTS [dbo].[sp_Adminator_Login];
GO

-- 2. Drop Old Tables (Order matters due to FKs)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Adminator_ProfileDesignations]') AND type in (N'U'))
BEGIN
    DROP TABLE [dbo].[Adminator_ProfileDesignations];
END
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Adminator_AppRoles]') AND type in (N'U'))
BEGIN
    DROP TABLE [dbo].[Adminator_AppRoles];
END
GO

-- 3. Create New Mapping Table: Profile -> App
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Adminator_ProfileAppAccess]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Adminator_ProfileAppAccess](
        [AccessId] [int] IDENTITY(1,1) NOT NULL,
        [ProfileId] [int] NOT NULL,
        [AppId] [int] NOT NULL,
        CONSTRAINT [PK_Adminator_ProfileAppAccess] PRIMARY KEY CLUSTERED ([AccessId] ASC),
        CONSTRAINT [FK_ProfileAppAccess_Profile] FOREIGN KEY ([ProfileId]) REFERENCES [dbo].[Adminator_AccessProfiles] ([ProfileId]) ON DELETE CASCADE,
        CONSTRAINT [FK_ProfileAppAccess_App] FOREIGN KEY ([AppId]) REFERENCES [dbo].[Adminator_Apps] ([AppId]) ON DELETE CASCADE,
        CONSTRAINT [UQ_Profile_App] UNIQUE ([ProfileId], [AppId])
    )
END
GO

-- 4. Seed Data for New Mapping
-- We need to re-establish that 'TastyUser' has access to 'Tasty Customers'
DECLARE @ProfileTasty INT = (SELECT ProfileId FROM [dbo].[Adminator_AccessProfiles] WHERE ProfileName = 'TastyUser');
DECLARE @AppTasty INT = (SELECT AppId FROM [dbo].[Adminator_Apps] WHERE AppKey = 'tasty-customers');

-- Only insert if both exist and mapping doesn't exist
IF @ProfileTasty IS NOT NULL AND @AppTasty IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM [dbo].[Adminator_ProfileAppAccess] WHERE ProfileId = @ProfileTasty AND AppId = @AppTasty)
        INSERT INTO [dbo].[Adminator_ProfileAppAccess] (ProfileId, AppId) VALUES (@ProfileTasty, @AppTasty);
END
GO

-- 5. Recreate Login Procedure
CREATE OR ALTER PROCEDURE [dbo].[sp_Adminator_Login]
    @Email nvarchar(255)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Get User & Profile Info
    SELECT 
        u.UserId,
        u.Email,
        u.PasswordHash,
        u.FirstName,
        u.LastName,
        u.IsActive,
        p.ProfileId,
        p.ProfileName,
        p.IsGlobalAdmin
    FROM 
        [dbo].[Adminator_Users] u
    LEFT JOIN
        [dbo].[Adminator_AccessProfiles] p ON u.ProfileId = p.ProfileId
    WHERE 
        u.Email = @Email AND u.IsActive = 1;

    -- 2. Get Accessible Apps
    -- Returns list of apps this user's profile is explicitly allowed to access
    SELECT 
        a.AppId,
        a.AppKey,
        a.AppName,
        a.Description
    FROM 
        [dbo].[Adminator_Users] u
    INNER JOIN
        [dbo].[Adminator_ProfileAppAccess] paa ON u.ProfileId = paa.ProfileId
    INNER JOIN
        [dbo].[Adminator_Apps] a ON paa.AppId = a.AppId
    WHERE 
        u.Email = @Email;
END
GO
