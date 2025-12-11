-- Add ConfigPath column to Adminator_Apps
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'ConfigPath' AND Object_ID = Object_ID(N'Adminator_Apps'))
BEGIN
    ALTER TABLE Adminator_Apps ADD ConfigPath NVARCHAR(255) NULL;
END
GO

-- Update Tasty Customers to use the dynamic config
-- We assume the config will be uploaded to 'apps/tasty-customers/config.json' in the bucket
-- We also move the icon to the same folder for better organization
UPDATE Adminator_Apps 
SET 
    ConfigPath = 'apps/tasty-customers/config.json',
    AppIcon = 'apps/tasty-customers/icon.png',
    -- We keep RoutePath as the internal link, but the frontend will handle it dynamically
    RoutePath = '/apps/tasty-customers' 
WHERE AppKey = 'tasty-customers';
GO

-- Update Login SP to return ConfigPath
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
        a.RoutePath,
        a.ConfigPath
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
