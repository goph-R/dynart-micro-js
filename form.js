const Form = new function() {

    const that = this

    this.getValue = function($input) {
        let v = null
        if (that.isCheckbox($input)) {
            v = $input.prop('checked')
        } else if (that.isRadio($input)) {
            const name = $input.attr('name') // radio inputs need name!
            const selected = $('input[type="radio"][name="' + name + '"]:checked')
            v = selected ? selected.val() : ''
        } else {
            v = $input.val() ? $input.val() : ''
        }
        if (!$input.attr('data-no-convert') && (typeof(v) !== 'boolean')) { // isNaN(bool) == false
            if (Number.isInteger(v)) {
                v = parseInt(v)
            } else if (!isNaN(v)) {
                v = parseFloat(v)
            }
        }
        if (typeof v === 'string') {
            v = $input.attr('data-no-trim') ? v : v.trim()
        }
        return v
    }

    this.getTagName = function($input) {
        return $input.prop('tagName') ? $input.prop('tagName').toLowerCase() : ''
    }

    this.getInputType = function($input) {
        return $input.attr('type') ? $input.attr('type').toLowerCase() : 'text'
    }

    this.isSelect = function($input) {
        return that.getTagName($input) === 'select'
    }

    this.isRadio = function($input) {
        return that.getTagName($input) === 'input' && that.getInputType($input) === 'radio'
    }

    this.isCheckbox = function($input) {
        return that.getTagName($input) === 'input' && that.getInputType($input) === 'checkbox'
    }

    this.hasValue = function($input) {
        if (that.isSelect($input)) {
            const noSelectionValue = $input.attr('data-no-selection-value') ? $input.attr('data-no-selection-value') : -1
            return $input.val() != noSelectionValue
        }
        return !!that.getValue($input)
    }

    this.sanitize = function(value) {
        return ('' + value).replaceAll('"', '&quot;')
    }

    this.setValue = function($input, value) {
        if (that.isSelect($input)) {
            $input.find('option[value="' + that.sanitize(value) + '"]').prop('selected', true)
            $input.change()
        } else if (that.isRadio($input)) {
            const name = $input.attr('name') // radio inputs need name!
            $('input[type="radio"][name="' + name + '"][value="' + that.sanitize(value) + '"]').prop('checked', true)
        } else if (that.isCheckbox($input)) {
            $input.prop('checked', value)
        } else {
            $input.attr('value', value === null ? '' : value)
        }
    }

    this.bindTextInput = function($input, func, events = 'change keyup') {
        // because of ajax requests we don't want to send a request right after keyup
        let timeout = null
        const boundFunc = func.bind($input)
        $input.on(events, function() {
            if (timeout) {
                clearTimeout(timeout)
            }
            timeout = setTimeout(boundFunc, 400)
        })
    }
}
