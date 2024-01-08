const DynamicListColumnView = {
    Text: function(item, property) {
        return item[property]
    },
    NonBreakingText: function(item, property) {
        return item[property].replaceAll(' ', '&nbsp;')
    },
    Check: function(item, property) {
        return item[property] ? '&check;' : ''
    },
    DateTime: function(item, property) {
        const d = new Date(item[property])
        return d.toLocaleString()
    }
}

const DynamicList = function(selector, options) {

    const element = $(selector).get()

    const $defaultForm = $('<form>')
    $defaultForm.html(`
        <input type="hidden" name="limitOffset" value="0">
        <input type="hidden" name="limitMax" value="100">
        <input type="hidden" name="orderBy" value="id">
        <input type="hidden" name="orderDir" value="desc">
    `)

    // create layout
    $(element).html(`
        <table>
            <thead>
                <tr>
                    <th class="checkbox-column"><input type="checkbox"></th>                    
                    <th class="actions-column"></th>
                </tr>
            </thead>
            <tbody>
                <tr class="template">
                    <td class="checkbox-column"><input type="checkbox"></td>
                    <td class="actions-column">
                        <ul class="action-list row-actions">
                            <li class="template"><button><i class="fa-solid"></i><span></span></button></li>
                        </ul>
                    </td>
                </tr>
            </tbody>
        </table>
        <div class="pagination">
            <button class="prev-button"><i class="fa-solid fa-caret-left"></i><span></span></button>
            <button class="next-button"><i class="fa-solid fa-caret-right"></i><span></span></button>
            <ul>
                <li class="template"><a></a></li>
            </ul>
        </div>
    `)

    // set options
    const idProperty = options.idProperty || 'id'
    const columnViews = options.columnViews || {}
    const groupActions = options.groupActions || null
    const rowActions = options.rowActions || []
    const $filterForm = options.$filterForm || $defaultForm
    const findItems = options.findItems || function(filters) { return { items: [], total: 0 } }
    const defaultTexts = {
        prev: 'Prev',
        next: 'Next'
    }
    const texts = options.texts ? $.extend({}, defaultTexts, options.texts) : defaultTexts

    let $rowCheckboxes = []

    const $body = $(element).find('tbody')
    const $rowTemplate = $body.find('tr')
    const $rowActionTemplate = $body.find('.row-actions li')
    const $prevButton = $(element).find('.prev-button')
    const $nextButton = $(element).find('.next-button')
    $prevButton.find('span').text(texts.prev)
    $nextButton.find('span').text(texts.next)

    // create columns
    let $prevHeader = $(element).find('th.actions-column')
    let $prevCell = $body.find('td.actions-column')
    Object.entries(columnViews).forEach(function (entry) {

        const [property, columnView] = entry

        const $header = $('<th>')
        $header.attr('data-property', property)
        $header.html(DynamicListColumnView.NonBreakingText(columnView, 'label'))
        $header.insertAfter($prevHeader)
        $prevHeader = $header

        const $cell = $('<td>')
        $cell.attr('data-property', property)
        if (columnView.align) {
            $cell.css('text-align', columnView.align)
        }
        $cell.insertAfter($prevCell)
        $prevCell = $cell
    })

    // init group actions
    if (groupActions) {
        groupActions.forEach(function (groupAction) {
            groupAction.$button.click(function() {
                groupAction.action(selectedIds())
            })
        })
    } else {
        $(element).find('.checkbox-column').each(function (i, e) { $(e).hide() })
    }

    function createFromTemplate($templateElement) {
        const result = $templateElement.clone()
        result.removeClass('template')
        result.find('.template').each(function (i, e) {
            $(e).remove()
        })
        return result
    }

    function refreshCallback(result) {

        // clear rows
        $body.find('tr').each(function (i, e) {
            if (!$(e).hasClass('template')) {
                $(e).remove()
            }
        })
        $rowCheckboxes = []

        // add rows
        result.items.forEach(function (item) {

            const $row = createFromTemplate($rowTemplate)

            // add checkbox
            const $rowCheckbox = $row.find('input[type=checkbox]')
            $rowCheckbox.attr('value', item[idProperty])
            $rowCheckbox.change(adjustGroupActionButtons)
            $rowCheckboxes.push($rowCheckbox)

            // add row actions
            const $rowActions = $row.find('.row-actions')
            rowActions.forEach(function (rowAction) {
                const $rowAction = createFromTemplate($rowActionTemplate)
                const $button = $rowAction.find('button')
                const $icon = $rowAction.find('i')
                const $label = $rowAction.find('span')
                $button.click(function() {
                    rowAction.action(item[idProperty])
                })
                $icon.addClass(rowAction.icon)
                $label.text(rowAction.label)
                $rowActions.append($rowAction)
            })

            // add property cells
            Object.entries(item).forEach(function (entry) {
                const [property, value] = entry
                if (!columnViews[property]) {
                    return
                }
                const view = columnViews[property].view || DynamicListColumnView.Text
                const $cell = $row.find('td[data-property="' + property + '"]')
                $cell.html(view(item, property))
            })

            $body.append($row)
        })

        adjustGroupActionButtons()
    }

    function selectedIds() {
        const result = []
        $rowCheckboxes.forEach(function ($checkbox) {
            if ($checkbox.is(':checked')) {
                result.push($checkbox.attr('value'))
            }
        })
        return result
    }

    function adjustGroupActionButtons() {
        let anyChecked = false
        $rowCheckboxes.forEach(function ($checkbox) {
            anyChecked |= $checkbox.is(':checked')
        })
        groupActions.forEach(function (groupAction) {
            groupAction.$button.prop('disabled', !anyChecked)
        })
    }

    this.refresh = function() {
        const filters = {}
        const inputs = $filterForm.serializeArray()
        inputs.forEach(function (input) {
            filters[input.name] = input.value
        })
        findItems(filters, refreshCallback)
    }

    this.refresh()
}
