# EMAIL TEMPLATE TESTER

App Node js che permette di inviare un template html via email ad una lista di destinatari, al fine di poterlo testare su diversi client di posta.

Richiede Node js 24.x o successive.

## File .env

Nella root del progetto è necessario creare un file `.env` per il corretto funzionamento dell'app. Il file deve contenere le seguenti variabili:

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