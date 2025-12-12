/*
    MIGRATION 08: FIX ADMIN ACCESS
    ------------------------------
    Updates sp_Adminator_Login to automatically grant access to ALL apps
    for users with IsGlobalAdmin = 1.
*/

CREATE OR ALTER PROCEDURE [dbo].[sp_Adminator_Login]
    @Email nvarchar(255)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Get User & Profile Info
    DECLARE @IsGlobalAdmin BIT;

    -- Result Set 1: User Info
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

    -- Capture IsGlobalAdmin for the next query
    SELECT @IsGlobalAdmin = p.IsGlobalAdmin
    FROM [dbo].[Adminator_Users] u
    LEFT JOIN [dbo].[Adminator_AccessProfiles] p ON u.ProfileId = p.ProfileId
    WHERE u.Email = @Email AND u.IsActive = 1;

    -- 2. Get Accessible Apps
    IF @IsGlobalAdmin = 1
    BEGIN
        -- Global Admin sees ALL active apps
        SELECT 
            AppId, 
            AppKey, 
            AppName, 
            Description, 
            AppIcon, 
            RoutePath, 
            ConfigPath 
        FROM 
            [dbo].[Adminator_Apps] 
        WHERE 
            IsActive = 1
        ORDER BY 
            AppName;
    END
    ELSE
    BEGIN
        -- Standard User sees only assigned apps
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
            u.Email = @Email AND a.IsActive = 1
        ORDER BY 
            a.AppName;
    END
END
