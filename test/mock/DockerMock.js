

class Container {
  
  constructor(Id) {
    this.Id = Id
    this._inspected = false
  }
  
  async inspect() {
    this._inspected = true
    return this
  }
}

class MockDocker {
  getContainer(id) { return new Container(id) }
}




module.exports = MockDocker
