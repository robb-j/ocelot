const expect = require('chai').expect

const { DockerMock, GitlabMock } = require('../mock')

const Manager = require('../../web/Manager')

describe('ManagerTest', function() {
  
  let manager = null
  
  let config = {
    usersKey: 'DOKKU_USERS',
    adminEmail: 'admin@me.co'
  }
  
  let userMap = {
    geoff: { email: 'geoff@me.co' },
    bob: { email: 'me@bob.co' }
  }
  
  beforeEach(async function() {
    manager = new Manager(
      new DockerMock(),
      new GitlabMock(),
      { whitelist: [] },
      userMap,
      config
    )
  })
  
  
  describe('#findEnvValue', function() {
    
    it('should default to null', async function() {
      let value = manager.findEnvValue([], 'test')
      expect(value).to.equal(null)
    })
    
    it('should return the matching value', async function() {
      let env = [ 'my_value=1234' ]
      let value = manager.findEnvValue(env, 'my_value')
      expect(value).to.equal('1234')
    })
  })
  
  describe('#emailsFromContainer', function() {
    
    it('should default to the admin email', async function() {
      let emails = manager.emailsFromContainer({
        Config: { Env: [ ] }
      })
      expect(emails).to.include('admin@me.co')
    })
    
    it('should map an email addresse', async function() {
      let emails = manager.emailsFromContainer({
        Config: { Env: [ 'DOKKU_USERS=geoff' ] }
      })
      expect(emails).to.include('geoff@me.co')
    })
    
    it('should get multiple emails', async function() {
      let emails = manager.emailsFromContainer({
        Config: { Env: [ 'DOKKU_USERS=geoff,bob' ] }
      })
      expect(emails).to.include('geoff@me.co')
      expect(emails).to.include('me@bob.co')
    })
  })
  
  
  describe('#inspectedContainers', function() {
    it('should inspect the containers', async function() {
      
      let cs = await manager.inspectContainers([
        { Id: 'somehash' }
      ])
      
      expect(cs).to.have.lengthOf(1)
      expect(cs[0]).to.have.property('Id', 'somehash')
      expect(cs[0]).to.have.property('_inspected', true)
    })
  })
  
  
  describe('#containersToWarn', function() {
    // ...
  })
  
  describe('#containersToKill', function() {
    // ...
  })
})
