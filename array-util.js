const ArrayUtil = new function() {

    const that = this

    this.removeElementsByIndices = function(values, removeIndices) {
        const result = [];
        for (let i = 0; i < values.length; i++) {
            if (!removeIndices.includes(i)) {
                result.push(values[i])
            }
        }
        return result
    }

    this.findElementByFieldValue = function(source, fieldName, value, returnIndex = false) {
        for (let i = 0; i < source.length; i++) {
            if (source[i][fieldName] == value) { // no type check with reason!
                return returnIndex ? i : source[i]
            }
        }
        return null
    }

    this.replaceElementByFieldValue = function(source, fieldName, value, newElement) {
        for (let i = 0; i < source.length; i++) {
            if (source[i][fieldName] == value) { // no type check with reason!
                source[i] = newElement
                return true
            }
        }
        return false
    }

    this.removeElementsByFieldValues = function(source, fieldName, values) {
        const indices = []
        for (let i = 0; i < values.length; i++) {
            const index = that.findElementByFieldValue(source, fieldName, values[i], true)
            if (index !== null) {
                indices.push(index)
            }
        }
        return that.removeElementsByIndices(source, indices)
    }

    this.findMinFieldValue = function(values, fieldName, defaultMin = Number.MAX_VALUE) {
        let min = defaultMin;
        for (let i = 0; i < values.length; i++) {
            const v = parseFloat(values[i][fieldName])
            if (v < min) {
                min = v
            }
        }
        return min
    }
}
