const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

const sendRegistrationMail = (userName, userEmail) => {
    const mailFillerObject = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `WELCOMEEEE!! ${userName}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Platform</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;-webkit-font-smoothing: antialiased;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-collapse: collapse;">
        <tr>
            <td bgcolor="#4F46E5" style="padding: 40px 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Welcome, ${userName}!</h1>
            </td>
        </tr>
        
        <tr>
            <td style="padding: 40px 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                <p style="margin: 0 0 20px 0;">Thank you for registering an account with us. We are absolutely thrilled to have you join our community!</p>
                <p style="margin: 0 0 30px 0;">Your account is now fully active. You can log in at any time to explore your personalized dashboard and get started.</p>
            </td>
        </tr>

        <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; font-size: 12px; color: #9ca3af; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 10px 0;">You received this email because you recently signed up for a new account.</p>
                <p style="margin: 0;">&copy; 2026 DOGOSINFOTEX. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>
`
    }
    transporter.sendMail(mailFillerObject, (error, info) => {
        if (error) {
            console.log(error)
        }
        if (info) {
            console.log(info)
        }
    })
}

const sendForgetPassToUser = (userName, userEmail, resetLink) => {
    const mailFillerObject = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `HELLO!! ${userName} PASSWORD RESETD!`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Platform</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;-webkit-font-smoothing: antialiased;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-collapse: collapse;">
        <tr>
            <td bgcolor="#73ff00" style="padding: 40px 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Hello, ${userName}!</h1>
            </td>
        </tr>
        
        <tr>
            <td style="padding: 40px 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                <p style="margin: 0 0 20px 0;">Hello ${userName}! We received a request to reset your password. Click the button below to securely create a new password.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="margin: 0; font-size: 12px; color: #4F46E5; word-break: break-all;">${resetLink}</p>
                <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
            </td>
        </tr>

        <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; font-size: 12px; color: #9ca3af; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 10px 0;">You received this email because you recently forgetn up account password.</p>
                <p style="margin: 0;">&copy; 2026 DOGOSINFOTEX. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>
`
    }
    transporter.sendMail(mailFillerObject, (error, info) => {
        if (error) {
            console.log(error)
        }
        if (info) {
            console.log(info)
        }
    })
}

const sendResetPasswordToUser = (userName, userEmail) => {
    const mailFillerObject = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `Alert Your password is updated`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Platform</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;-webkit-font-smoothing: antialiased;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-collapse: collapse;">
        <tr>
            <td bgcolor="#ff00bf" style="padding: 40px 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Hello, ${userName}!</h1>
            </td>
        </tr>
        
        <tr>
            <td style="padding: 40px 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                <p style="margin: 0 0 20px 0;">Hello ${userName}! We found out that you just reset you account password this mail is to confirm that you password has been reset succesfully!</p>
            </td>
        </tr>

        <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; font-size: 12px; color: #9ca3af; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 10px 0;">You received this email because Someone recently changed account password.</p>
                <p style="margin: 0;">&copy; 2026 DOGOSINFOTEX. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>
`
    }
    transporter.sendMail(mailFillerObject, (error, info) => {
        if (error) {
            console.log(error)
        }
        if (info) {
            console.log(info)
        }
    })
}

const sendRoleAssignmentMail = (userName, userEmail, roleName) => {
    const mailFillerObject = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: `Role Update: You are now a ${roleName}`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Role Updated</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;-webkit-font-smoothing: antialiased;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-collapse: collapse;">
        <tr>
            <td bgcolor="#4F46E5" style="padding: 40px 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Role Update</h1>
            </td>
        </tr>
        
        <tr>
            <td style="padding: 40px 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                <p style="margin: 0 0 20px 0;">Hello ${userName},</p>
                <p style="margin: 0 0 30px 0;">An administrator has updated your account permissions. You have been assigned the new role of <strong>${roleName}</strong>.</p>
                <p style="margin: 0 0 30px 0;">Log in to your account to explore your new permissions!</p>
            </td>
        </tr>

        <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; font-size: 12px; color: #9ca3af; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 10px 0;">You received this email because your account role was recently changed.</p>
                <p style="margin: 0;">&copy; 2026 DOGOSINFOTEX. All rights reserved.</p>
            </td>
        </tr>
    </table>
</body>
</html>
`
    }
    transporter.sendMail(mailFillerObject, (error, info) => {
        if (error) {
            console.log(error)
        }
        if (info) {
            console.log(info)
        }
    })
}

module.exports = { sendRegistrationMail, sendForgetPassToUser, sendResetPasswordToUser, sendRoleAssignmentMail }