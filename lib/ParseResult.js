
module.exports = class ParseResult {
  
  get hasErrors() { return this.errors.length }
  
  constructor(value = null) {
    this.value = value
    this.errors = []
    this.warnings = []
  }
  
  addError(...error) {
    this.errors.push(...error)
    return this
  }
  
  addErrorIf(condition, error, formatter = null) {
    condition && this.addError(formatter ? formatter(error) : error)
  }
  
  addWarningIf(condition, warn, formatter = null) {
    condition && this.addWarning(formatter ? formatter(warn) : warn)
  }
  
  addWarning(...warn) {
    this.warnings.push(...warn)
    return this
  }
  
  mergeMessages(result) {
    this.addError(...result.errors)
    this.addWarning(...result.warnings)
    return this
  }
}
