
const nodemailer = require('nodemailer')
const winston = require('winston')

class EmailClient {
  
  constructor(config) {
    this.config = config
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: 587,
      secure: false,
      auth: {
        user: config.user,
        pass: config.pass
      }
    })
  }
  
  async sendTo(to, from, subject, text) {
    
    const config = { to, from, subject, text }
    
    try {
      await this.sendEmail(config)
      winston.info('Send Email', config)
    }
    catch (error) {
      winston.error('Email failed', error)
    }
  }
  
  sendEmail(config) {
    return new Promise((resolve, reject) => {
      this.transporter.sendMail(config, (error, info) => {
        if (error) reject(error)
        else resolve(info)
      })
    })
  }
  
}

module.exports.EmailClient = EmailClient
