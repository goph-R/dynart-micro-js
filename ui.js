const UI = new function() {

    const that = this
    const $container = $('#ui_message')

    $container.find('.close').click(function() {
        that.hideMessage()
    })

    this.scrollToTop = function(top = 0, duration = 0) {
        $("html, body").stop().animate({ scrollTop: top }, duration)
    }

    this.showMessage = function(message, isError = false) {
        if (isError) {
            $container.addClass('errors')
        } else {
            $container.removeClass('errors')
        }
        $container.html(message)
        $container.show()
    }

    this.hideMessage = function() {
        $container.html('')
        $container.hide()
    }

    this.showError = function(message) {
        that.showMessage(message, true)
    }
}