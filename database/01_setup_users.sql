-- Create the Adminator Users table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Adminator_Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Adminator_Users](
        [UserId] [int] IDENTITY(1,1) NOT NULL,
        [Email] [nvarchar](255) NOT NULL,
        [PasswordHash] [nvarchar](255) NOT NULL,
        [FirstName] [nvarchar](100) NULL,
        [LastName] [nvarchar](100) NULL,
        [Role] [nvarchar](50) NOT NULL DEFAULT 'Admin',
        [IsActive] [bit] NOT NULL DEFAULT 1,
        [CreatedAt] [datetime] NOT NULL DEFAULT GETDATE(),
        [LastLogin] [datetime] NULL,
     CONSTRAINT [PK_Adminator_Users] PRIMARY KEY CLUSTERED 
    (
        [UserId] ASC
    )
    )
END
GO

-- Create a unique index on Email
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Adminator_Users_Email' AND object_id = OBJECT_ID('Adminator_Users'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [IX_Adminator_Users_Email] ON [dbo].[Adminator_Users]
    (
        [Email] ASC
    )
END
GO

-- Create Stored Procedure for Login
CREATE OR ALTER PROCEDURE [dbo].[sp_Adminator_Login]
    @Email nvarchar(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        UserId,
        Email,
        PasswordHash,
        FirstName,
        LastName,
        Role,
        IsActive
    FROM 
        [dbo].[Adminator_Users]
    WHERE 
        Email = @Email AND IsActive = 1
END
GO

-- Create Stored Procedure to Update Last Login
CREATE OR ALTER PROCEDURE [dbo].[sp_Adminator_UpdateLastLogin]
    @UserId int
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE [dbo].[Adminator_Users]
    SET LastLogin = GETDATE()
    WHERE UserId = @UserId
END
GO

-- Example: Insert a default admin user (Password: 'password123' - You should generate a real bcrypt hash)
-- The hash below is for 'password123' generated with bcryptjs (salt rounds 10)
-- $2a$10$...................... (This is just a placeholder, you need to generate one using the tool I'll provide)
