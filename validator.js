const Validator = function(allValidators) {

    const INPUT_INDEX = 0
    const REQUIRED_INDEX = 1
    const VALIDATORS_START_INDEX = 2

    const that = this

    let changeData = true
    let modified = false

    this.hideAllErrors = function() {
        for (let i = 0; i < allValidators.length; i++) {
            Validate.hideError(allValidators[i][INPUT_INDEX])
        }
    }

    this.setDataOnChange = function(value) {
        changeData = value
    }

    this.setDataModified = function(value) {
        modified = value
    }

    this.isDataModified = function() {
        return modified
    }

    this.validate = function($input) {
        Validate.hideError($input)
        const validators = findValidatorsForInput($input)
        if (!validators) {
            return true
        }
        let required = validators[REQUIRED_INDEX]
        if (typeof required !== 'boolean') { // if not boolean: it depends on an input (associated)
            required = Form.hasValue(required) // current input is required only if the other input has value
        }
        const hasValue = Form.hasValue($input)
        if (!required && !hasValue) {
            return true
        }
        if (required && !hasValue) {
            Validate.showError($input, 'Required')
            return false
        }
        for (let i = VALIDATORS_START_INDEX; i < validators.length; i++) {
            const v = validators[i]
            const message = Array.isArray(v) ? v[0]($input, v[1]) : v($input)
            if (message) {
                Validate.showError($input, message)
                return false
            }
        }
        return true
    }

    this.validateAll = function() {
        let result = true
        for (let i = 0; i < allValidators.length; i++) {
            result &= that.validate(allValidators[i][INPUT_INDEX])
        }
        return result
    }

    this.bindValue = function($input, object, property, value) {
        if (changeData && that.validate($input)) {
            that.hideAssociatedErrors($input)
            object[property] = value !== undefined ? value : Form.getValue($input)
            modified = true
            return true
        }
        return false
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

    function findValidatorsForInput($input) {
        for (let i = 0; i < allValidators.length; i++) {
            if (allValidators[i][INPUT_INDEX].attr('id') == $input.attr('id')) {
                return allValidators[i]
            }
        }
    }
}

const Validate = new function() {

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
        return $('#error_' + $input.attr('id'))
    }

    this.isInteger = function($input) {
        const intRegex = /^[0-9]+$/
        const value = '' + Form.getValue($input)
        return intRegex.test(value) ? '' : 'Not an integer'
    }

    this.isCurrency = function($input) {
        const currencyRegex = /^[A-Z]{3}$/
        const value = ('' + Form.getValue($input)).toUpperCase()
        return currencyRegex.test(value) ? '' : 'Not a currency'
    }

    this.isIpV4 = function($input) {
        const value = '' + Form.getValue($input)
        const ipRegex = /^(localhost|(\d{1,3}\.){3}\d{1,3})$/
        if (!ipRegex.test(value)) {
            return 'Not a valid IP address'
        }
        if (value.toLowerCase() === 'localhost') {
            return '';
        }
        const parts = value.split('.')
        if (parts.length !== 4) {
            return 'IP address should consist of four parts separated by periods'
        }
        for (let i = 0; i < parts.length; i++) {
            const part = parseInt(parts[i])
            if (isNaN(part) || part < 0 || part > 255) {
                return 'Each part should be a number between 0 and 255'
            }
        }
        return ''
    }

    this.isTime = function($input) {
        const value = '' + Form.getValue($input)
        const timeRegex = /^(0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;
        if (timeRegex.test(value)) {
            const [hours, minutes] = value.split(':').map(Number)
            if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                return ''
            }
        }
        return 'Not a valid time'
    }
}