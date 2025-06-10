const UI = new function() {

    const that = this
    const $container = $('#ui_message')

    let timeout = null

    this.scrollToTop = function(top = 0, duration = 0) {
        $("html, body").stop().animate({ scrollTop: top }, duration)
    }

    this.showMessage = function(message, isError = false) {
        if (isError) {
            $container.addClass('errors')
        } else {
            $container.removeClass('errors')
        }
        $container.html(message + '<span class="close">&times;</span>')
        $container.find('.close').click(that.hideMessage)
        $container.show()
        if (timeout) {
            clearTimeout(timeout)
        }
    }

    this.hideMessage = function() {
        $container.html('')
        $container.hide()
    }

    this.showError = function(message) {
        that.showMessage(message, true)
    }

    this.showFetchError = function(url, params, result) {
        if (result.status === 401) {
            that.showError('You are not authorized to perform this action. (Maybe login session expired?)')
            return
        }
        let errorMsg = 'Error happened while fetching ' + url
        if (params != null) {
            errorMsg += ' with parameters: ' + JSON.stringify(params)
        }
        errorMsg += "\n" + JSON.stringify(result)
        that.showError(errorMsg)
    }
}
