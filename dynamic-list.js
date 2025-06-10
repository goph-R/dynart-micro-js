// TODO: .btn-danger everywhere? we should use the btn-default usually

const DynamicListColumnView = {
    rowCheckboxCounter: 0,
    text: function (item, property) {
        return item[property]
    },
    nonBreakingText: function (item, property) {
        return item[property].replaceAll(' ', '&nbsp;')
    },
    check: function (item, property) {
        return item[property] ? '&check;' : '&times;'
    },
    dateTime: function (item, property) {
        const d = new Date(item[property])
        return d.toLocaleString()
    }
}

const DynamicList = function ($container, options) {

    const that = this

    const orderByName = options.orderByName || 'sort'
    const orderDirName = options.orderDirName || 'order'
    const offsetName = options.offsetName || 'offset'
    const maxName = options.maxName || 'max'

    const formHtml = `
        <form style="display: none">
            <div>
                <input type="hidden" name="${orderDirName}" value="asc">
                <input type="hidden" name="${orderByName}" value="">
                <input type="hidden" name="${offsetName}" value="0">
                <input type="hidden" name="${maxName}" value="1000">
            </div>
        </form>
    `
    const html = options.html || `
        <div class="dynamic-list col-md-12 list grid-body table-responsive" style="padding: 0">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th class="sortable checkbox-column" style="padding: 8px 8px 8px 10px"><input type="checkbox"></th>
                        <th class="actions-column"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="template">
                        <td class="checkbox-column"><input type="checkbox"></td>
                        <td class="actions-column">
                            <ul class="action-list row-actions">
                                <li class="template"><span class="button icon"><a class="edit"></a></span></li>
                            </ul>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="no-results">No results</div>
            <div class="paging bottom row" style="margin: 0; padding: 1em">
                <ul class="customPaginationRight" style="float: right; padding-right:0; text-align: right; margin-bottom: 0; margin-top: 3px; width: 100%"></ul>
                <div class="customPagination" style="float: left"></div>
            </div>
        </div>
    `

    $container.html(options.$filterForm ? html : formHtml + html)

    const idProperty = options.idProperty || 'id'
    const columnViews = options.columnViews || {}
    const groupActions = options.groupActions || null
    const rowActions = options.rowActions || []
    const findItems = options.findItems || function (filters) {
        return {items: [], total: 0}
    }
    const $filterForm = options.$filterForm ? options.$filterForm : $container.find('form')
    const initialItems = options.initialItems || []
    const initialItemsTotal = options.initialItemsTotal || initialItems.length
    const orderDisabled = options.orderDisabled || []
    const allOrderDisabled = options.allOrderDisabled || false

    const $noResults = $container.find('.no-results')
    const $table = $container.find('table')
    const $tbody = $container.find('tbody')
    const $rowTemplate = $tbody.find('tr')
    const $rowActionTemplate = $tbody.find('.row-actions li')
    const $headCheckbox = createHeaderCheckbox();

    const $paging = $container.find('.paging')
    const $pageLinks = $paging.find('.customPaginationRight')
    const $recordsLabel = $paging.find('.customPagination')

    const $maxInput = $filterForm.find('input[name="' + maxName + '"]')
    const $offsetInput = $filterForm.find('input[name="' + offsetName + '"]')
    const $orderDirInput = $filterForm.find('input[name="' + orderDirName + '"]')
    const $orderByInput = $filterForm.find('input[name="' + orderByName + '"]')

    let $pageInput = null

    let initialized = false
    let selectedIds = []
    let totalItems = 0
    let $rowCheckboxes = []
    let refreshDoneCallback = null

    this.refresh = function (doneCallback = null) {
        refreshDoneCallback = doneCallback
        if (!initialized && initialItems.length) {
            initialized = true
            return refreshCallback({items: initialItems, total: initialItemsTotal})
        }
        const filters = {}
        const inputs = $filterForm.serializeArray()
        for (let input of inputs) {
            filters[input.name] = input.value
        }
        findItems(filters, refreshCallback)
    }

    this.clearSelection = function () {
        selectedIds = []
    }

    createColumns();
    initGroupActions();
    initRowActions();
    adjustOrderUi();

    $filterForm.submit(function (event) {
        event.preventDefault()
        if ($pageInput && $pageInput.val()) {
            $offsetInput.attr('value', (Math.floor($pageInput.val()) - 1) * getPageSize())
        } else {
            $offsetInput.attr('value', 0) // reset page to 0 on filter change
        }
        that.refresh()
        return false
    })

    this.refresh()

    function pageLinkClick() {
        setCurrentPage($(this).attr('data-page'))
        that.refresh()
    }

    function getPageSize() {
        return parseInt($maxInput.attr('value'))
    }

    function getCurrentPage() {
        return parseInt($offsetInput.attr('value')) / getPageSize()
    }

    function setCurrentPage(page) {
        $offsetInput.attr('value', page * getPageSize())
    }

    function createHeaderCheckbox() {
        const $headCheckbox = $container.find('th.checkbox-column input')
        $headCheckbox.change(function () {
            const isChecked = $headCheckbox.prop('checked')
            for (let $cb of $rowCheckboxes) {
                $cb.prop('checked', isChecked)
                $cb.change()
            }
            adjustInfo()
        })
        return $headCheckbox;
    }

    function initRowActions() {
        if (rowActions.length) {
            $container.find('.actions-column').show()
        } else {
            $container.find('.actions-column').hide()
        }
    }

    function createColumns() {
        let $prevHeader = $container.find('th.checkbox-column')
        let $prevCell = $tbody.find('td.checkbox-column')
        for (let entry of Object.entries(columnViews)) {
            const [property, columnView] = entry

            const $header = $('<th>')
            const content = DynamicListColumnView.nonBreakingText(columnView, 'label')

            if (allOrderDisabled || orderDisabled.includes(property)) {
                $header.html(content)
            } else {
                const $link = $('<a>')
                $link.html(content)
                $link.click(function () {
                    changeOrderTo(property)
                })
                $header.append($link)
            }

            $header.attr('data-property', property)
            $header.insertAfter($prevHeader)
            $prevHeader = $header

            const $cell = $('<td>')
            $cell.attr('data-property', property)
            if (columnView.align) {
                $cell.css('text-align', columnView.align)
            }
            $cell.insertAfter($prevCell)
            $prevCell = $cell
        }
    }

    function adjustOrderUi() {
        $container.find('th').each(function (i, e) {
            $(e).removeClass('asc')
                .removeClass('desc')
                .removeClass('sorted')
        })
        const property = $orderByInput.val()
        if (!property) {
            return;
        }
        const $header = $container.find('th[data-property=' + property + ']')
        $header.addClass('sorted')
            .addClass($orderDirInput.val())
    }

    function changeOrderTo(property) {
        const orderDir = $orderDirInput.val()
        const orderBy = $orderByInput.val()
        $orderByInput.val(property)
        $orderDirInput.val(orderBy === property ? (orderDir === 'asc' ? 'desc' : 'asc') : 'asc')
        adjustOrderUi()
        that.refresh()
    }

    function createFromTemplate($templateElement) {
        const result = $templateElement.clone()
        result.removeClass('template')
        result.find('.template').each(function (i, e) {
            $(e).remove()
        })
        return result
    }

    function initGroupActions() {
        if (groupActions) {
            for (let groupAction of groupActions) {
                groupAction.$button.click(function () {
                    groupAction.action(selectedIds)
                })
            }
        } else {
            $container.find('.checkbox-column').each(function (i, e) {
                $(e).hide()
            })
        }
    }

    function refreshCallback(result) {
        clearContent();
        adjustPaging(result)
        createContent(result);
        adjustGroupActionButtons()
        adjustHeadCheckbox()
        if (typeof refreshDoneCallback === 'function') {
            refreshDoneCallback()
        }
    }

    function clearContent() {
        $tbody.find('tr').each(function (i, e) {
            if (!$(e).hasClass('template')) {
                $(e).remove()
            }
        })
        $rowCheckboxes = []
    }

    function createContent(result) {
        if (result.items.length) {
            $noResults.hide()
            const pageSize = getPageSize()
            const maxI = pageSize > result.items.length ? result.items.length : pageSize
            for (let i = 0; i < maxI; i++) {
                addItem(result.items[i], i)
            }
            $table.show()
        } else {
            $noResults.show()
        }
    }

    function addItem(item, indexOnPage) {
        const $row = createFromTemplate($rowTemplate)
        const rowCheckboxId = addRowCheckbox($row, item);
        $row.addClass(indexOnPage % 2 === 0 ? 'odd' : 'even')
        addRowActions($row, item);
        for (let property of Object.keys(columnViews)) {
            addCell(property, $row, rowCheckboxId, item);
        }
        $tbody.append($row)
    }

    function addRowCheckbox($row, item) {
        const $rowCheckbox = $row.find('input[type=checkbox]')
        const rowCheckboxCounter = ++DynamicListColumnView.rowCheckboxCounter
        const rowCheckboxId = 'row_checkbox_' + rowCheckboxCounter + '_' + item[idProperty]
        $rowCheckbox.attr('id', rowCheckboxId)
        $rowCheckbox.attr('value', item[idProperty])
        let checked = false
        for (let i = 0; i < selectedIds.length; i++) {
            if (item[idProperty] == selectedIds[i]) { // intentionally no type check
                checked = true
                break
            }
        }
        $rowCheckbox.prop('checked', checked)
        $rowCheckbox.change(rowCheckboxChange)
        $rowCheckboxes.push($rowCheckbox)
        return rowCheckboxId;
    }

    function rowCheckboxChange() {
        changeSelection($(this))
        adjustGroupActionButtons()
        adjustHeadCheckbox()
        adjustInfo()
    }

    function changeSelection($checkbox) {
        if ($checkbox.prop('checked')) {
            selectedIds.push($checkbox.attr('value'))
        } else {
            selectedIds = selectedIds.filter(function (id) {
                return id !== $checkbox.attr('value')
            })
        }
    }

    function addRowActions($row, item) {
        const $rowActions = $row.find('.row-actions')
        for (let rowAction of rowActions) {
            const $rowAction = createFromTemplate($rowActionTemplate)
            const $button = $rowAction.find('a')
            $button.click(function () {
                rowAction.action(item[idProperty], item)
            })
            $button.addClass(rowAction.type)
            $button.attr('title', rowAction.title)
            $rowActions.append($rowAction)
        }
    }

    function addCell(property, $row, rowCheckboxId, item) {
        const view = columnViews[property].view || DynamicListColumnView.text
        const viewOptions = columnViews[property].options || {}
        const $cell = $row.find('td[data-property="' + property + '"]')
        if (columnViews[property].width) {
            $cell.css('width', columnViews[property].width)
        }
        const $label = $('<label>')
        $label.attr('for', rowCheckboxId)
        $label.html(view(item, property, viewOptions))
        addEventsForItem($label, viewOptions);
        $cell.html('')
        $cell.append($label)
    }

    function addEventsForItem($label, viewOptions) {
        const $element = $label.find('[data-use-events]:first')
        if (!$element) {
            return
        }
        for (let entry of Object.entries(viewOptions)) {
            const [k, v] = entry
            if (typeof v === 'function' && k.startsWith('on')) {
                const lowerCaseEventWithoutOn = k.slice(2).toLowerCase()
                $element.on(lowerCaseEventWithoutOn, v)
            }
        }
    }

    function isAllCheckedOnPage() {
        if ($rowCheckboxes.length === 0) {
            return false;
        }
        for (let i = 0; i < $rowCheckboxes.length; i++) {
            if ($rowCheckboxes[i].prop('checked') === false) {
                return false
            }
        }
        return true
    }

    function adjustGroupActionButtons() {
        let anyChecked = selectedIds.length > 0
        if (!groupActions) {
            return
        }
        for (let groupAction of groupActions) {
            const $b = groupAction.$button
            $b.prop('disabled', !anyChecked)
            $b.removeClass('btn-danger')
            if (anyChecked) {
                $b.addClass('btn-danger')
            }
        }
    }

    function adjustHeadCheckbox() {
        $headCheckbox.prop('checked', isAllCheckedOnPage())
    }

    this.count = function () {
        return totalItems
    }

    function adjustPaging(result) {
        const pageSize = getPageSize()
        totalItems = result.total ? result.total : result.items.length
        let totalPages = Math.ceil(totalItems / pageSize)
        if (isNaN(totalPages) || !isFinite(totalPages)) {
            totalPages = 0
            console.error('Total pages is not a number or not finite')
        }
        let currentPage = getCurrentPage()
        if (currentPage > totalPages - 1) {
            currentPage = 0
            setCurrentPage(currentPage)
        }
        $pageLinks.html('')
        if (totalItems > pageSize) {
            createPagingForm(totalPages)
            createPageLinks(currentPage, totalPages);
            $pageLinks.find('a').show()
        }
        adjustInfo();
    }

    function createPageLinks(currentPage, totalPages) {
        const pagesRange = 5; // TODO: make it configurable

        let showPrevDots = false;
        let showNextDots = false;
        let startPage = 1;
        let endPage = totalPages;

        if (totalPages > pagesRange) {
            const halfRange = Math.floor(pagesRange / 2);
            startPage = currentPage - halfRange;
            let addition = startPage < 0 ? -startPage : 0;
            if (startPage < 1) {
                startPage = 1;
            }
            endPage = currentPage + halfRange + addition;
            if (endPage > totalPages) {
                startPage -= endPage - totalPages;
                if (startPage < 1) {
                    startPage = 1;
                }
                endPage = totalPages;
            }
            showPrevDots = startPage > 1;
            showNextDots = endPage < totalPages;
        }

        // create page links
        if (currentPage != 0) {
            const $link = $('<a class="prevLink">Previous</a>');
            $link.attr('data-page', currentPage - 1);
            $link.click(pageLinkClick);
            $pageLinks.append($link);
        }
        $pageLinks.append(createPageLink(0));
        if (showPrevDots) {
            $pageLinks.append(createPageLink('...'));
        }
        for (let i = startPage; i < endPage; i++) {
            $pageLinks.append(createPageLink(i, currentPage));
        }
        if (showNextDots) {
            $pageLinks.append(createPageLink('...', currentPage));
        }
        if (totalPages > 1 && endPage !== totalPages) {
            $pageLinks.append(createPageLink(totalPages - 1, currentPage));
        }
        if (currentPage != totalPages - 1) {
            const $link = $('<a class="nextLink">Next</a>');
            $link.attr('data-page', currentPage + 1);
            $link.click(pageLinkClick);
            $pageLinks.append($link);
        }
    }

    function createPageLink(i) {
        const $pageLink = $('<a>')
        $pageLink.attr('data-page', i)
        if (i === getCurrentPage()) {
            $pageLink.addClass('currentStep')
        } else {
            $pageLink.addClass('step')
        }
        if (Number.isInteger(i)) {
            $pageLink.html(i + 1)
            $pageLink.click(pageLinkClick)
        } else {
            $pageLink.addClass('dots')
            $pageLink.html(i)
        }
        return $pageLink
    }

    function createPagingForm(totalPages, currentPage) {
        const $pagingForm = $('<form class="paging-form">')
        $pageInput = $('<input type="number" min="1" name="page" placeholder="Pg#" style="width: 50px; float: right">')
        $pageInput.attr('max', totalPages)
        $pageInput.attr('value', getCurrentPage() + 1)
        const $pageGoButton = $('<button class="btn btn-danger" style="float: right">Go</button>')
        $pagingForm.append($pageInput)
        $pagingForm.append($pageGoButton)
        $pagingForm.submit(function (event) {
            event.preventDefault()
            $filterForm.submit()
        })
        $pageLinks.append($pagingForm)
    }

    function adjustInfo() {
        const currentPage = getCurrentPage()
        const pageSize = getPageSize()
        const pageStart = currentPage * pageSize + 1
        let pageEnd = currentPage * pageSize + pageSize
        if (pageEnd > totalItems) {
            pageEnd = totalItems
        }
        const $div = $('<div>')
        const $spanRecords = $('<span class="records">')
        const $spanSelection = $('<span class="selected-items">')
        const recordsHtml = 'Records ' + pageStart + '-' + pageEnd + ' from ' + totalItems
        $spanRecords.html(totalItems ? recordsHtml : '')
        if (groupActions) {
            const selectedHtml = '<br><span class="selected-items">Selected: ' + selectedIds.length + '</span>';
            $spanSelection.html(totalItems ? selectedHtml : '')
            $div.append($spanRecords)
            $div.append($spanSelection)
            if (selectedIds.length > 0) {
                const $clearSelection = $('<a class="clear-selection">')
                // unfortunately, we have to set the css properties here, TODO: why?
                $clearSelection.css('float', 'none') // override css `div.list a.paging`
                $clearSelection.css('background-color', 'transparent')
                $clearSelection.css('border', 'none')
                $clearSelection.css('color', '#a00')
                $clearSelection.css('cursor', 'pointer')
                $clearSelection.html('Clear selection')
                $div.append($clearSelection)
            }
        } else if (totalItems > 0) {
            $div.html($spanRecords)
        }
        $recordsLabel.html($div.html())
        if (selectedIds.length > 0) {
            $recordsLabel.find('.clear-selection').click(function () {
                if (confirm('Clear selection?')) {
                    selectedIds = []
                    that.refresh()
                }
            })
        }
    }
}
