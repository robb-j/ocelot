
class Utils {
  
  get appState() { return this._appState }
  get userMap() { return this._userMap }
  get config() { return this._config }
  
  constructor(docker, gitlab, appState, users, config = {}) {
    this.docker = docker
    this.gitlab = gitlab
    this._appState = appState
    this._userMap = users
    this._config = config
  }
  
  
  
  
  findEnvValue(env, name) {
    for (let variable of env) {
      if (variable.startsWith(name)) {
        return variable.replace(/^\w*=/g, '')
      }
    }
    return null
  }
  
  emailsFromContainer(container) {
    
    // Get the user's env var from the container
    let usersCsv = this.findEnvValue(
      container.Config.Env,
      this.config.usersKey
    )
    
    
    let emails = []
    
    
    // Split the users csv to iterate each one
    if (usersCsv) {
      usersCsv.split(',').forEach(user => {
        if (this.userMap[user]) {
          emails.push(this.userMap[user].email)
        }
      })
    }
    
    // If no emails were found, send to the admin
    if (emails.length === 0) {
      emails.push(this.config.adminEmail)
    }
    
    return emails
  }
  
  async inspectContainers(containers) {
    return Promise.all(containers.map(c => {
      return this.docker.getContainer(c.Id).inspect()
    }))
  }
  
  
  
  async containersToWarn() {
    
    // Find ones older than the MAX_AGE & not whitelisted
    // - Work out their owner (*)
    // - Send them and email, cc-ing openlab-support
    // - Set 'com.dokku-manager.notified' label to today
    return []
  }
  
  async containersToKill() {
    
    // Find containers with the label set and the refresh period expired
    // - Stop those containers
    
    return []
  }
  
}

module.exports = Utils
