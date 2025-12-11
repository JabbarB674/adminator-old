-- 1. Ensure the App Exists with Correct Config
IF NOT EXISTS (SELECT * FROM Adminator_Apps WHERE AppKey = 'tasty-customers')
BEGIN
    INSERT INTO Adminator_Apps (AppKey, AppName, Description, AppIcon, RoutePath, ConfigPath)
    VALUES (
        'tasty-customers', 
        'Tasty Customers', 
        'Manage catering orders, customer profiles, and menus.', 
        'icon.png', 
        '/apps/tasty-customers',
        'config.json'
    );
END
ELSE
BEGIN
    UPDATE Adminator_Apps 
    SET 
        AppName = 'Tasty Customers',
        Description = 'Manage catering orders, customer profiles, and menus.',
        AppIcon = 'icon.png',
        RoutePath = '/apps/tasty-customers',
        ConfigPath = 'config.json'
    WHERE AppKey = 'tasty-customers';
END
GO

-- 2. Assign Access to All Global Admins
-- We find all profiles that are Global Admins and ensure they have access
DECLARE @AppId INT = (SELECT AppId FROM Adminator_Apps WHERE AppKey = 'tasty-customers');

IF @AppId IS NOT NULL
BEGIN
    INSERT INTO Adminator_ProfileAppAccess (ProfileId, AppId)
    SELECT p.ProfileId, @AppId
    FROM Adminator_AccessProfiles p
    WHERE p.IsGlobalAdmin = 1
    AND NOT EXISTS (
        SELECT 1 FROM Adminator_ProfileAppAccess paa 
        WHERE paa.ProfileId = p.ProfileId AND paa.AppId = @AppId
    );
END
GO

-- 3. Assign Access to 'Administrator' Profile explicitly (if not covered above)
DECLARE @ProfileAdmin INT = (SELECT ProfileId FROM Adminator_AccessProfiles WHERE ProfileName = 'Administrator');
DECLARE @AppTasty INT = (SELECT AppId FROM Adminator_Apps WHERE AppKey = 'tasty-customers');

IF @ProfileAdmin IS NOT NULL AND @AppTasty IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM Adminator_ProfileAppAccess WHERE ProfileId = @ProfileAdmin AND AppId = @AppTasty)
        INSERT INTO Adminator_ProfileAppAccess (ProfileId, AppId) VALUES (@ProfileAdmin, @AppTasty);
END
GO
