
module.exports = class ParseResult {
  
  constructor(value = null) {
    this.value = value
    this.errors = []
    this.warnings = []
  }
  
  addError(...error) {
    this.errors.push(...error)
  }
  
  addWarning(...warn) {
    this.warnings.push(...warn)
  }
  
  mergeMessages(result) {
    this.addError(...result.errors)
    this.addWarning(...result.warnings)
  }
}
