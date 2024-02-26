const DynamicListColumnView = {
    rowCheckboxCounter: 0,
    text: function(item, property) {
        return item[property]
    },
    nonBreakingText: function(item, property) {
        return item[property].replaceAll(' ', '&nbsp;')
    },
    check: function(item, property) {
        return item[property] ? '&check;' : ''
    },
    dateTime: function(item, property) {
        const d = new Date(item[property])
        return d.toLocaleString()
    }
}

const DynamicList = function($container, options) {

    const that = this

    const defaultFormHtml = `
        <form style="display: none">
            <div>
                <input type="hidden" name="order" value="">
                <input type="hidden" name="sort" value="asc">
                <input type="hidden" name="offset" value="0">
                <input type="hidden" name="max" value="1000">
            </div>
        </form>
    `

    $container.html(options.$filterForm ? '' : defaultFormHtml + `
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
            <div class="paging bottom row" style="margin-right:0;">
                <div style="col-xs-6">
                    <ul class="customPaginationRight" style="float:right; padding-right:0; text-align: right">
                        <a href="#" class="prevLink">Previous</a>
                        <a href="#" class="nextLink">Next</a>
                    </ul>
                </div>
                <div class="col-xs-6 customPagination" style="float:left">
                    Records 1-20 from 40
                </div>
            </div>
        </div>
    `)

    const idProperty = options.idProperty || 'id'
    const columnViews = options.columnViews || {}
    const groupActions = options.groupActions || null
    const rowActions = options.rowActions || []
    const findItems = options.findItems || function(filters) { return { items: [], total: 0 } }
    const $filterForm = options.$filterForm ? options.$filterForm : $container.find('form')

    const $noResults = $container.find('.no-results')
    const $table = $container.find('table')
    const $tbody = $container.find('tbody')
    const $rowTemplate = $tbody.find('tr')
    const $rowActionTemplate = $tbody.find('.row-actions li')
    const $headCheckbox = createHeaderCheckbox();

    const $paging = $container.find('.paging')
    const $prevLink = $paging.find('.prevLink')
    const $nextLink = $paging.find('.nextLink')
    const $pages = $paging.find('.customPaginationRight')
    const $recordsLabel = $paging.find('.customPagination')

    const $maxInput = $filterForm.find('input[name="max"]')
    const $offsetInput = $filterForm.find('input[name="offset"]')
    const $orderInput = $filterForm.find('input[name="order"]')
    const $sortInput = $filterForm.find('input[name="sort"]')

    let $rowCheckboxes = []
    let refreshDoneCallback = null

    this.refresh = function(doneCallback = null) {
        refreshDoneCallback = doneCallback // TODO: better solution
        const filters = {}
        const inputs = $filterForm.serializeArray()
        inputs.forEach(function (input) {
            filters[input.name] = input.value
        })
        findItems(filters, refreshCallback)
    }


    createColumns();
    initGroupActions();
    initRowActions();

    $prevLink.click(pageLinkClick)
    $nextLink.click(pageLinkClick)

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
            if ($headCheckbox.prop('checked')) {
                $rowCheckboxes.forEach(function ($cb) {
                    $cb.prop('checked', true)
                })
            } else if (isAllChecked()) {
                $rowCheckboxes.forEach(function ($cb) {
                    $cb.prop('checked', false)
                })
            }
            adjustGroupActionButtons()
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
        // create columns
        let $prevHeader = $container.find('th.checkbox-column')
        let $prevCell = $tbody.find('td.checkbox-column')
        Object.entries(columnViews).forEach(function (entry) {

            const [property, columnView] = entry

            const $header = $('<th>')
            $header.attr('data-property', property)
            $header.html(DynamicListColumnView.nonBreakingText(columnView, 'label'))
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
        // init group actions
        if (groupActions) {
            groupActions.forEach(function (groupAction) {
                groupAction.$button.click(function () {
                    groupAction.action(selectedIds())
                })
            })
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
            const currentPage = getCurrentPage()
            for (let i = 0; i < pageSize; i++) {
                const index = currentPage * pageSize + i
                if (index > result.items.length - 1) {
                    break
                }
                addItem(result.items[i], i)
            }
            $table.show()
        } else {
            $table.hide()
            $noResults.show()
        }
    }

    function addItem(item, indexOnPage) {
        const $row = createFromTemplate($rowTemplate)
        const rowCheckboxId = addRowCheckbox($row, item);
        $row.addClass(indexOnPage % 2 === 0 ? 'odd' : 'even')
        addRowActions($row, item);
        Object.keys(columnViews).forEach(function (property) {
            addCell(property, $row, rowCheckboxId, item);
        })
        $tbody.append($row)
    }

    function addRowCheckbox($row, item) {
        const $rowCheckbox = $row.find('input[type=checkbox]')
        const rowCheckboxCounter = ++DynamicListColumnView.rowCheckboxCounter
        const rowCheckboxId = 'row_checkbox_' + rowCheckboxCounter + '_' + item[idProperty]
        $rowCheckbox.attr('value', item[idProperty])
        $rowCheckbox.change(adjustGroupActionButtons)
        $rowCheckbox.attr('id', rowCheckboxId)
        $rowCheckboxes.push($rowCheckbox)
        return rowCheckboxId;
    }

    function addRowActions($row, item) {
        const $rowActions = $row.find('.row-actions')
        rowActions.forEach(function (rowAction) {
            const $rowAction = createFromTemplate($rowActionTemplate)
            const $button = $rowAction.find('a')
            $button.click(function () {
                rowAction.action(item[idProperty])
            })
            $button.addClass(rowAction.type)
            $button.attr('title', rowAction.title)
            $rowActions.append($rowAction)
        })
    }

    function addCell(property, $row, rowCheckboxId, item) {
        const view = columnViews[property].view || DynamicListColumnView.text
        const viewOptions = columnViews[property].options || {}
        const $cell = $row.find('td[data-property="' + property + '"]')
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
        Object.entries(viewOptions).forEach(function (entry) {
            const [k, v] = entry
            if (typeof v === 'function' && k.startsWith('on')) {
                const lowerCaseEventWithoutOn = k.slice(2).toLowerCase()
                $element.on(lowerCaseEventWithoutOn, v)
            }
        })
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

    function isAllChecked() {
        if (!$rowCheckboxes.length) {
            return false
        }
        for (let i = 0; i < $rowCheckboxes.length; i++) {
            if (!$rowCheckboxes[i].is(':checked')) {
                return false
            }
        }
        return true
    }

    function adjustGroupActionButtons() {
        let anyChecked = false
        $rowCheckboxes.forEach(function ($checkbox) {
            anyChecked |= $checkbox.is(':checked')
        })
        if (groupActions) {
            groupActions.forEach(function (groupAction) {
                const $b = groupAction.$button
                $b.prop('disabled', !anyChecked)
                $b.removeClass('btn-danger')
                if (anyChecked) {
                    $b.addClass('btn-danger')
                }
            })
        }
        $headCheckbox.prop('checked', isAllChecked())
    }

    function adjustPaging(result) {

        // adjust pages
        const total = result.total ? result.total : result.items.length
        const pageSize = getPageSize()

        let currentPage = getCurrentPage()

        if (total <= pageSize) {
            // hide if no paging needed
            $pages.hide()
        } else {
            // set total
            let totalPages = Math.ceil(total / pageSize)
            if (isNaN(totalPages) || !isFinite(totalPages)) {
                totalPages = 0
                console.error('Total pages is not a number or not finite')
            }
            if (currentPage > totalPages - 1) {
                currentPage = totalPages - 1
                setCurrentPage(currentPage)
            }
            // remove old page links
            $pages.find('.step').remove()
            $pages.find('.currentStep').remove()
            // add new page links
            for (let i = 0; i < totalPages; i++) {
                const $pageLink = $('<a>')
                $pageLink.attr('data-page', i)
                if (i == currentPage) {
                    $pageLink.addClass('currentStep')
                } else {
                    $pageLink.addClass('step')
                }
                $pageLink.html(i + 1)
                $pageLink.click(pageLinkClick)
                $prevLink.insertAfter($pageLink)
            }
            // show paging
            $pages.show()
        }

        // adjust prev-next links
        if (currentPage === 0) {
            $prevLink.hide()
        } else {
            $prevLink.attr('data-page', currentPage - 1)
            $prevLink.show()
        }
        if (currentPage === total - 1) {
            $nextLink.hide()
        } else {
            $nextLink.attr('data-page', currentPage + 1)
            $nextLink.show()
        }

        // adjust records label
        const pageStart = currentPage * pageSize + 1
        let pageEnd = currentPage * pageSize + pageSize
        if (pageEnd > total) {
            pageEnd = total
        }
        $recordsLabel.html('Records ' + pageStart + '-' + pageEnd + ' from ' + total)
    }
}