# EMAIL TEMPLATE TESTER

A Node.js application that allows sending an HTML template via email to a list of recipients, in order to test it on different email clients.

Requires **Node.js 24.x** or later.

## .env File

In the project root, it is necessary to create a `.env` file for the correct functioning of the app. The file must contain the following variables:

```
# Logger info
LOG_PATH=./logs/sender.log
LOG_TYPE=console
LOG_LEVEL=all

# Credentials for Nodemailer
SMTP_HOST=host.smpt.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASS=password

# Email info
SENDER_FROM_NAME=Name Surname or whatever
SENDER_FROM_EMAIL=name.surname@email.com
```

## Commands

The app must be run from the CLI. To send emails, execute the following command:

`npm run sender`