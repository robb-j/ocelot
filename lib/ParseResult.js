
/** An object as the result of parsing a document, with the result, errors & warnings */
module.exports = class ParseResult {
  
  /** If any errors have occurred */
  get hasErrors() { return this.errors.length }
  
  /** If any warnings have arisen */
  get hasWarnings() { return this.warnings.length }
  
  
  
  /**
   * Creates A new ParseResult with a prefilled error(s)
   * @param  {...string} error The error(s) to prefile with
   * @return {ParseResult}
   */
  static fromErrors(...error) { return (new this()).addError(...error) }
  
  
  
  /** Creates a new ParseResult with an initial value */
  constructor(value = {}) {
    this.value = value
    this.errors = []
    this.warnings = []
  }
  
  
  
  /**
   * Adds an error to the result
   * @param {...string} error The error(s) to add
   * @return ParseResult
   */
  addError(...error) {
    this.errors.push(...error)
    return this
  }
  
  /**
   * Adds a warning to the result
   * @param {...string} warn The warning(s) to add
   * @return ParseResult
   */
  addWarning(...warn) {
    this.warnings.push(...warn)
    return this
  }
  
  /**
   * Adds an error if a condition is met
   * @param {boolean} condition The condition to check
   * @param {string} error The error to add
   * @param {function} [formatter=null] Optionally formats the error message on request
   * @return ParseResult
   */
  addErrorIf(condition, error, formatter = null) {
    condition && this.addError(formatter ? formatter(error) : error)
  }
  
  /**
   * Adds an warning if a condition is met
   * @param {boolean} condition The condition to check
   * @param {string} warn The warn to add
   * @param {function} [formatter=null] Optionally formats the warn message on request
   * @return ParseResult
   */
  addWarningIf(condition, warn, formatter = null) {
    condition && this.addWarning(formatter ? formatter(warn) : warn)
  }
  
  /**
   * Merges the messages of another result into this
   * @param  {ParseResult} result The result to merge in
   * @return {ParseResult}
   */
  mergeMessages(result) {
    this.addError(...result.errors)
    this.addWarning(...result.warnings)
    return this
  }
}
