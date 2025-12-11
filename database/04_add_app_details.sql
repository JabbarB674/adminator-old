-- Add columns if they don't exist
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'AppIcon' AND Object_ID = Object_ID(N'Adminator_Apps'))
BEGIN
    ALTER TABLE Adminator_Apps ADD AppIcon NVARCHAR(255) NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'RoutePath' AND Object_ID = Object_ID(N'Adminator_Apps'))
BEGIN
    ALTER TABLE Adminator_Apps ADD RoutePath NVARCHAR(255) NULL;
END
GO

-- Update existing apps (if any) or Insert TastyCustomers
-- Check if TastyCustomers exists
IF NOT EXISTS (SELECT * FROM Adminator_Apps WHERE AppKey = 'tasty-customers')
BEGIN
    INSERT INTO Adminator_Apps (AppKey, AppName, Description, AppIcon, RoutePath)
    VALUES ('tasty-customers', 'Tasty Customers', 'Manage catering and customers', 'app_pictures/tasty_logo.png', '/apps/tasty-customers');
END
ELSE
BEGIN
    UPDATE Adminator_Apps 
    SET AppIcon = 'app_pictures/tasty_logo.png', RoutePath = '/apps/tasty-customers'
    WHERE AppKey = 'tasty-customers';
END
GO

-- Ensure Administrator Profile has access
DECLARE @ProfileAdmin INT = (SELECT ProfileId FROM Adminator_AccessProfiles WHERE ProfileName = 'Administrator');
DECLARE @AppTasty INT = (SELECT AppId FROM Adminator_Apps WHERE AppKey = 'tasty-customers');

IF @ProfileAdmin IS NOT NULL AND @AppTasty IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM Adminator_ProfileAppAccess WHERE ProfileId = @ProfileAdmin AND AppId = @AppTasty)
        INSERT INTO Adminator_ProfileAppAccess (ProfileId, AppId) VALUES (@ProfileAdmin, @AppTasty);
END
GO

-- Update Login SP to return new columns
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
    SELECT 
        a.AppId,
        a.AppKey,
        a.AppName,
        a.Description,
        a.AppIcon,
        a.RoutePath
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
