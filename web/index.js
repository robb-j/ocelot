const fs = require('fs')

const winston = require('winston')
const Gitlab = require('gitlab')
const Docker = require('dockerode')
const Yaml = require('node-yaml')
const Manager = require('./Manager')
const { EmailClient } = require('./email')



;(async () => {
  
  try {
    
    // Configure winston
    winston.add(winston.transports.File, { filename: 'logs/app.log' })
    
    
    
    
    // let docker = connectToDocker()
    // let gitlab = connectoToGitlab()
    //
    //
    // let state = await fetchState(gitlab)
    // let users = await fetchUsers(gitlab)
    //
    // let manager = new Manager(docker, gitlab, state, users, config)
    //
    //
    //
    // let toWarn = await manager.containersToWarn()
    
    
    // let email = new EmailClient(config.smtp)
    //
    // await email.sendTo(
    //   'rob.anderson@ncl.ac.uk',
    //   'openlab-support@ncl.ac.uk',
    //   'Test Email',
    //   'Success!'
    // )
    
    
    
    // Get all running containers with dokku/x in the name
    // let containers = await docker.listContainers()
    
    
    // Inspec the containers to be warned
    // let toWarn = await inspectContainers(
    //   docker,
    //   getContainersToWarn(containers)
    // )
    //
    // // Send warn containers
    // toWarn.forEach(warnContainer)
    
  }
  catch (error) {
    console.log(error)
  }
})()



function connectoToGitlab(config) {
  return Gitlab({
    url: config.url,
    token: config.token
  })
}

function connectToDocker() {
  const socketPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
  
  // Check we have access to docker
  if (!fs.statSync(socketPath).isSocket()) {
    return winston.error('Cannot connect to docker')
  }
  
  return new Docker({ socketPath })
}

async function fetchUsers(gitlab) {
  
  let users = await new Promise(resolve => {
    gitlab.users.all(resolve)
  })
  
  return users.reduce((map, user) => {
    map[user.username] = user
    return map
  }, {})
}

async function fetchState(gitlab) {
  
  let file = await new Promise(resolve => {
    gitlab.projects.repository.showFile({
      projectId: configRepo,
      ref: 'master',
      file_path: configPath
    }, resolve)
  })
  
  // let buffer = new Buffer(file.content, 'base64')
  let buffer = Buffer.from(file.content, 'base64')
  
  let data = Yaml.parse(buffer.toString())
  
  data.whitelist = data.whitelist || []
  data.warned = data.warned || {}
  
  return data
}

async function warnContainer(container) {
  
  // Get the users var set on the container
  let emails = emailsFromContainer(container)
  
  
  let name = container.Name.split('.')[0]
    .replace(/\//g, '')
  
  let title = `Dokku App Expiry – ${name}`
  let body = `
  You are recieving this email because your dokku app '${name} is expiring.
  If you would like to keep you app online you can push your app again or you can contact us at ${adminEmail} about extending your app.
  
  Our new policy with dokku is that apps will be turned off after ${appLife} days, this is so we can provide a better service by removing apps that aren't used.
  
  Thanks,
  The Openlab Support Team
  `
  
  sendEmail(emails, title, body)
  
  
}




function getContainersToRemove(containers) {
  return containers
}
