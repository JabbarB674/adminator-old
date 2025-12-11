-- Remove Tasty Customers App and its associations

DECLARE @AppKey NVARCHAR(255) = 'tasty-customers';
DECLARE @AppId INT = (SELECT AppId FROM Adminator_Apps WHERE AppKey = @AppKey);

IF @AppId IS NOT NULL
BEGIN
    PRINT 'Found AppId: ' + CAST(@AppId AS NVARCHAR(20));

    -- 1. Remove associations from Profiles
    DELETE FROM Adminator_ProfileAppAccess WHERE AppId = @AppId;
    PRINT 'Deleted from Adminator_ProfileAppAccess';

    -- 2. Remove the App definition
    DELETE FROM Adminator_Apps WHERE AppId = @AppId;
    PRINT 'Deleted from Adminator_Apps';
END
ELSE
BEGIN
    PRINT 'App with key ' + @AppKey + ' not found.';
END
GO
