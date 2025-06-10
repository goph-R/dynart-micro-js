// allValidators: [array1, array2, array3, ...]
// validator array: [$input, required, validator]
// post validator array: [[function, $message]]

// `validator` is optional in the validator array: you just need a required flag

const Validator = function(allValidators) {

    const INPUT_INDEX = 0
    const REQUIRED_INDEX = 1
    const VALIDATOR_INDEX = 2

    const that = this

    let doChangeData = true
    let modified = false

    this.hideAllErrors = function() {
        for (let i = 0; i < allValidators.length; i++) {
            Validate.hideError(allValidators[i][INPUT_INDEX])
        }
    }

    this.setDataOnChange = function(value) {
        doChangeData = value
    }

    this.setDataModified = function(value) {
        modified = value
    }

    this.isDataModified = function() {
        return modified
    }

    this.validate = function($input, callback) {
        Validate.hideError($input)
        if (Array.isArray($input)) { // post validator
            return doValidate($input, $input[0], callback)
        }
        const data = findDataForInput($input)
        if (!data) {
            return callback(true)
        }
        let required = data[REQUIRED_INDEX]
        if (typeof required !== 'boolean') { // if not a boolean: it depends on an input (associated)
            required = Form.hasValue(required) // current input is required only if the other input has value
        }
        const hasValue = Form.hasValue($input)
        if (!required && !hasValue) {
            return callback(true)
        }
        if (required && !hasValue) {
            Validate.showError($input, 'Required')
            return callback(false)
        }
        doValidate($input, data[VALIDATOR_INDEX], callback)
    }

    function doValidate($input, validator, callback) {
        // validator can be undefined
        if (!validator) {
            return callback(true)
        }
        const resultCallback = function(message) {
            if (message) {
                Validate.showError($input, message)
                return callback(false)
            }
            return callback(true)
        }
        Array.isArray(validator)
            ? validator[0]($input, resultCallback, validator[1]) // call validator with options
            : validator($input, resultCallback) // call validator with NO options
    }

    this.validateAll = function(callback) {
        let result = true
        let validated = 0
        for (let i = 0; i < allValidators.length; i++) {
            that.validate(allValidators[i][INPUT_INDEX], function(valid) {
                result &= valid
                validated++
                if (validated === allValidators.length) {
                    return callback(result)
                }
            })
        }
    }

    this.bindValue = function($input, object, property, callback, defaultValue) {
        // callback and defaultValue is optional
        if (!doChangeData) {
            return callback ? callback(false) : null
        }
        that.validate($input, function(valid) {
            if (!valid) {
                return callback ? callback(false) : null
            }
            object[property] = defaultValue !== undefined ? defaultValue : Form.getValue($input)
            that.hideAssociatedErrors($input)
            modified = true
            return callback ? callback(true) : null
        })
    }

    this.hideAssociatedErrors = function($input) {
        if (Form.hasValue($input)) {
            return
        }
        for (let i = 0; i < allValidators.length; i++) {
            const required = allValidators[i][REQUIRED_INDEX]
            if (typeof required !== 'boolean' && required.attr('id') == $input.attr('id')) {
                Validate.hideError(allValidators[i][INPUT_INDEX])
            }
        }
    }

    function findDataForInput($input) {
        if (Array.isArray($input)) {
            return $input[0]
        }
        for (let i = 0; i < allValidators.length; i++) {
            if (allValidators[i][INPUT_INDEX].attr('id') == $input.attr('id')) {
                return allValidators[i]
            }
        }
    }
}

const Validate = new function() { // static class

    const that = this

    this.showError = function($input, message) {
        const $error = that.getErrorContainer($input)
        $error.html(message)
        $error.show()
    }

    this.hideError = function hideError($input) {
        that.getErrorContainer($input).hide()
    }

    this.getErrorContainer = function($input) {
        return Array.isArray($input)
            ? $input[1] // post validator
            : $('#error_' + $input.attr('id')) // pre validator
    }

    this.isInteger = function($input, callback) {
        const intRegex = /^[0-9]+$/
        const value = '' + Form.getValue($input)
        return callback(intRegex.test(value) ? '' : 'Not an integer')
    }

    this.isFloatWithTwoDecimals = function($input, callback) {
        const floatRegex = /^\d+(\.\d{1,2})?$/
        const value = '' + Form.getValue($input)
        return callback(floatRegex.test(value) ? '' : 'Not a float with two decimals')
    }

    this.isCurrency = function($input, callback) {
        const currencyRegex = /^[A-Z]{3}$/
        const value = ('' + Form.getValue($input)).toUpperCase()
        return callback(currencyRegex.test(value) ? '' : 'Not a currency')
    }

    this.isIpV4 = function($input, callback) {
        const value = '' + Form.getValue($input)
        const ipRegex = /^(localhost|(\d{1,3}\.){3}\d{1,3})$/
        if (!ipRegex.test(value)) {
            return callback('Not a valid IP address')
        }
        if (value.toLowerCase() === 'localhost') {
            return callback('')
        }
        const parts = value.split('.')
        if (parts.length !== 4) {
            return callback('IP address should consist of four parts separated by periods')
        }
        for (let i = 0; i < parts.length; i++) {
            const part = parseInt(parts[i])
            if (isNaN(part) || part < 0 || part > 255) {
                return callback('Each part should be a number between 0 and 255')
            }
        }
        return callback('')
    }

    this.isTime = function($input, callback) {
        const value = '' + Form.getValue($input)
        const timeRegex = /^(0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;
        if (timeRegex.test(value)) {
            const [hours, minutes] = value.split(':').map(Number)
            if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                return callback('')
            }
        }
        return callback('Not a valid time')
    }

    this.isExist = function($input, callback, options) {
        const url = Router.getUrlForAction(options.action)
        const params = { value: Form.getValue($input), except: options.current.dbId }
        let message = ''
        $.get(url, params).done(function(result) {
            if (result[RESPONSE_STATUS] === STATUS_OK) {
                message = result.exists ? 'Exists' : ''
            } else {
                UI.showError('Error happened while fetching ' + url + ' with parameters: ' + JSON.stringify(params) + "\n" + result[RESPONSE_MESSAGE])
            }
        }).error(function(result) {
            UI.showError('Error happened while fetching ' + url + ' with parameters: ' + JSON.stringify(params) + "\n" + result)
        }).complete(function() {
            callback(message)
        })
    }
}
