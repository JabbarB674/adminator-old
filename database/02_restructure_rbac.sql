/*
    RBAC RESTRUCTURE SCRIPT
    -----------------------
    Implements a "Profile-Based" Access Control System.
    
    Concepts:
    1. Apps: The applications available (e.g., 'Tasty Customers').
    2. AppRoles: Specific permissions within an app (e.g., 'TastyAdmin', 'TastyViewer').
    3. AccessProfiles: The "Unique IDs" assigned to users (e.g., 'SuperAdmin', 'StandardUser').
       - A Profile acts as a container for multiple AppRoles.
       - Example: Profile 5 can contain [App1_Admin] AND [App3_Viewer].
    4. Users: Assigned exactly ONE AccessProfile.
*/

-- 1. Create Apps Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Adminator_Apps]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Adminator_Apps](
        [AppId] [int] IDENTITY(1,1) NOT NULL,
        [AppName] [nvarchar](100) NOT NULL,
        [AppKey] [nvarchar](50) NOT NULL, -- Unique key (e.g., 'tasty-customers')
        [Description] [nvarchar](255) NULL,
        [IsActive] [bit] NOT NULL DEFAULT 1,
        CONSTRAINT [PK_Adminator_Apps] PRIMARY KEY CLUSTERED ([AppId] ASC),
        CONSTRAINT [UQ_Adminator_Apps_AppKey] UNIQUE ([AppKey])
    )
END
GO

-- 2. Create AppRoles Table (Defines specific permissions within an App or System)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Adminator_AppRoles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Adminator_AppRoles](
        [AppRoleId] [int] IDENTITY(1,1) NOT NULL,
        [RoleName] [nvarchar](50) NOT NULL, -- e.g., 'Admin', 'Viewer', 'Editor'
        [AppId] [int] NULL, -- NULL = System Level Role, Not NULL = App Specific Role
        [Description] [nvarchar](255) NULL,
        CONSTRAINT [PK_Adminator_AppRoles] PRIMARY KEY CLUSTERED ([AppRoleId] ASC),
        CONSTRAINT [FK_Adminator_AppRoles_Apps] FOREIGN KEY ([AppId]) REFERENCES [dbo].[Adminator_Apps] ([AppId]),
        CONSTRAINT [UQ_AppRole_Name] UNIQUE ([RoleName], [AppId])
    )
END
GO

-- 3. Create AccessProfiles Table (The "Unique IDs" assigned to Users)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Adminator_AccessProfiles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Adminator_AccessProfiles](
        [ProfileId] [int] IDENTITY(1,1) NOT NULL,
        [ProfileName] [nvarchar](50) NOT NULL, -- e.g., 'SuperAdmin', 'TastyManager'
        [IsGlobalAdmin] [bit] NOT NULL DEFAULT 0, -- If 1, has access to EVERYTHING automatically
        [Description] [nvarchar](255) NULL,
        CONSTRAINT [PK_Adminator_AccessProfiles] PRIMARY KEY CLUSTERED ([ProfileId] ASC),
        CONSTRAINT [UQ_AccessProfiles_Name] UNIQUE ([ProfileName])
    )
END
GO

-- 4. Create ProfileDesignations Table (Maps Profiles -> AppRoles)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Adminator_ProfileDesignations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Adminator_ProfileDesignations](
        [DesignationId] [int] IDENTITY(1,1) NOT NULL,
        [ProfileId] [int] NOT NULL,
        [AppRoleId] [int] NOT NULL,
        CONSTRAINT [PK_Adminator_ProfileDesignations] PRIMARY KEY CLUSTERED ([DesignationId] ASC),
        CONSTRAINT [FK_ProfileDesignations_Profile] FOREIGN KEY ([ProfileId]) REFERENCES [dbo].[Adminator_AccessProfiles] ([ProfileId]) ON DELETE CASCADE,
        CONSTRAINT [FK_ProfileDesignations_AppRole] FOREIGN KEY ([AppRoleId]) REFERENCES [dbo].[Adminator_AppRoles] ([AppRoleId]) ON DELETE CASCADE,
        CONSTRAINT [UQ_Profile_AppRole] UNIQUE ([ProfileId], [AppRoleId])
    )
END
GO

-- 5. SEED DATA
-- 5a. Seed Apps
IF NOT EXISTS (SELECT * FROM [dbo].[Adminator_Apps] WHERE AppKey = 'tasty-customers')
    INSERT INTO [dbo].[Adminator_Apps] (AppName, AppKey, Description) VALUES ('Tasty Customers', 'tasty-customers', 'Customer Management');

-- 5b. Seed AppRoles (System & App Specific)
-- System Roles (AppId IS NULL)
IF NOT EXISTS (SELECT * FROM [dbo].[Adminator_AppRoles] WHERE RoleName = 'Admin' AND AppId IS NULL)
    INSERT INTO [dbo].[Adminator_AppRoles] (RoleName, AppId) VALUES ('Admin', NULL);

-- Tasty App Roles
DECLARE @TastyAppId INT = (SELECT AppId FROM [dbo].[Adminator_Apps] WHERE AppKey = 'tasty-customers');
IF NOT EXISTS (SELECT * FROM [dbo].[Adminator_AppRoles] WHERE RoleName = 'TastyAdmin' AND AppId = @TastyAppId)
    INSERT INTO [dbo].[Adminator_AppRoles] (RoleName, AppId) VALUES ('TastyAdmin', @TastyAppId);

-- 5c. Seed AccessProfiles (The "Unique IDs")
-- Profile 1: Super Admin (Global Access)
IF NOT EXISTS (SELECT * FROM [dbo].[Adminator_AccessProfiles] WHERE ProfileName = 'SuperAdmin')
    INSERT INTO [dbo].[Adminator_AccessProfiles] (ProfileName, IsGlobalAdmin, Description) VALUES ('SuperAdmin', 1, 'Full System Access');

-- Profile 2: Standard Admin (System Admin Role)
IF NOT EXISTS (SELECT * FROM [dbo].[Adminator_AccessProfiles] WHERE ProfileName = 'Administrator')
    INSERT INTO [dbo].[Adminator_AccessProfiles] (ProfileName, IsGlobalAdmin, Description) VALUES ('Administrator', 0, 'System Administrator');

-- Profile 3: Tasty User (Only Tasty App)
IF NOT EXISTS (SELECT * FROM [dbo].[Adminator_AccessProfiles] WHERE ProfileName = 'TastyUser')
    INSERT INTO [dbo].[Adminator_AccessProfiles] (ProfileName, IsGlobalAdmin, Description) VALUES ('TastyUser', 0, 'Access to Tasty App only');

-- 5d. Map Profiles to AppRoles
DECLARE @ProfileAdmin INT = (SELECT ProfileId FROM [dbo].[Adminator_AccessProfiles] WHERE ProfileName = 'Administrator');
DECLARE @RoleSystemAdmin INT = (SELECT AppRoleId FROM [dbo].[Adminator_AppRoles] WHERE RoleName = 'Admin' AND AppId IS NULL);

IF NOT EXISTS (SELECT * FROM [dbo].[Adminator_ProfileDesignations] WHERE ProfileId = @ProfileAdmin AND AppRoleId = @RoleSystemAdmin)
    INSERT INTO [dbo].[Adminator_ProfileDesignations] (ProfileId, AppRoleId) VALUES (@ProfileAdmin, @RoleSystemAdmin);

DECLARE @ProfileTasty INT = (SELECT ProfileId FROM [dbo].[Adminator_AccessProfiles] WHERE ProfileName = 'TastyUser');
DECLARE @RoleTastyAdmin INT = (SELECT AppRoleId FROM [dbo].[Adminator_AppRoles] WHERE RoleName = 'TastyAdmin' AND AppId = @TastyAppId);

IF NOT EXISTS (SELECT * FROM [dbo].[Adminator_ProfileDesignations] WHERE ProfileId = @ProfileTasty AND AppRoleId = @RoleTastyAdmin)
    INSERT INTO [dbo].[Adminator_ProfileDesignations] (ProfileId, AppRoleId) VALUES (@ProfileTasty, @RoleTastyAdmin);
GO

-- 6. MODIFY USERS TABLE
-- Add ProfileId column
IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ProfileId' AND Object_ID = Object_ID(N'[dbo].[Adminator_Users]'))
BEGIN
    ALTER TABLE [dbo].[Adminator_Users] ADD [ProfileId] [int] NULL;
    
    -- Add Foreign Key
    ALTER TABLE [dbo].[Adminator_Users] WITH CHECK ADD CONSTRAINT [FK_Adminator_Users_Profile] FOREIGN KEY([ProfileId])
    REFERENCES [dbo].[Adminator_AccessProfiles] ([ProfileId]);
END
GO

-- 7. DATA MIGRATION
-- Map existing string roles to new Profiles
UPDATE [dbo].[Adminator_Users]
SET ProfileId = (SELECT ProfileId FROM [dbo].[Adminator_AccessProfiles] WHERE ProfileName = 'SuperAdmin')
WHERE Role = 'SuperAdmin' OR Role = 'superadmin';

UPDATE [dbo].[Adminator_Users]
SET ProfileId = (SELECT ProfileId FROM [dbo].[Adminator_AccessProfiles] WHERE ProfileName = 'Administrator')
WHERE Role = 'Admin' OR Role = 'admin';

-- Default others to a basic profile if needed, or leave NULL
-- For now, ensuring everyone has a profile if they had a role
UPDATE [dbo].[Adminator_Users]
SET ProfileId = (SELECT ProfileId FROM [dbo].[Adminator_AccessProfiles] WHERE ProfileName = 'Administrator')
WHERE ProfileId IS NULL AND Role IS NOT NULL;
GO

-- 8. CLEANUP (Drop old Role column)
-- Only run this if you are confident in the migration!
/*
IF EXISTS (SELECT * FROM sys.columns WHERE Name = N'Role' AND Object_ID = Object_ID(N'[dbo].[Adminator_Users]'))
BEGIN
    DECLARE @ConstraintName nvarchar(200)
    SELECT @ConstraintName = Name FROM sys.default_constraints 
    WHERE parent_object_id = OBJECT_ID(N'[dbo].[Adminator_Users]') 
    AND parent_column_id = (SELECT column_id FROM sys.columns WHERE NAME = N'Role' AND object_id = OBJECT_ID(N'[dbo].[Adminator_Users]'))
    
    IF @ConstraintName IS NOT NULL
        EXEC('ALTER TABLE [dbo].[Adminator_Users] DROP CONSTRAINT ' + @ConstraintName)

    ALTER TABLE [dbo].[Adminator_Users] DROP COLUMN [Role];
END
GO
*/

-- 9. UPDATE LOGIN PROCEDURE
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

    -- 2. Get Effective App Roles (If Global Admin, logic handled in app, or we could return all)
    -- This returns the specific App Roles assigned to the user's profile
    SELECT 
        ar.AppRoleId,
        ar.RoleName,
        ar.AppId,
        a.AppKey,
        a.AppName
    FROM 
        [dbo].[Adminator_Users] u
    INNER JOIN
        [dbo].[Adminator_ProfileDesignations] pd ON u.ProfileId = pd.ProfileId
    INNER JOIN
        [dbo].[Adminator_AppRoles] ar ON pd.AppRoleId = ar.AppRoleId
    LEFT JOIN
        [dbo].[Adminator_Apps] a ON ar.AppId = a.AppId
    WHERE 
        u.Email = @Email;
END
GO
