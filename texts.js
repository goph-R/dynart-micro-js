const Texts = new function() {

    const data = {}

    this.add = function(texts) {
        $.extend(data, texts)
    }

    this.get = function(id, params = []) {
        let text = data[id] || id
        params.forEach((value, index) => {
            const placeholder = new RegExp(`\\{${index}\\}`, "g")
            text = text.replace(placeholder, value)
        })
        return text
    }
}
