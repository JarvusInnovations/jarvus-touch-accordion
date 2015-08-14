/* jshint undef: true, unused: true, browser: true, quotmark: single, curly: true */
/* global Ext */
Ext.define('Jarvus.layout.Accordion', {
    extend: 'Ext.layout.Default',
    alias: ['layout.accordion'],

    config: {
        expandedItem: null,
        allowCollapse: true,
        scrollOnExpand: false,
        pressedCls: 'x-item-pressed'
    },

    constructor: function() {
        var me = this;
        me.callParent(arguments);
    },

    setContainer: function(container) {
        var me = this,
            options = {
                delegate: '> component'
            };

        me.callParent(arguments);

        container.innerElement.on('tap', 'onHeaderTap', me, {
            delegate: '.accordion-header'
        });

        container.on('hide', 'onItemHide', me, options)
            .on('show', 'onItemShow', me, options)
            .on('expand', 'onItemExpand', me, options)
            .on('collapse', 'onItemCollapse', me, options);

        container.addCls('jarvus-layout-accordion');
    },

    insertInnerItem: function(item, index) {
        var me = this,
            pressedCls = me.getPressedCls(),
            container = me.container,
            itemDom = item.element.dom,
            nextSibling = container.getInnerAt(index + 1),
            nextSiblingDom = nextSibling ? nextSibling.accordion.dom : null,
            accordion, accordionHeader;

        item.element.addCls('accordion-body');
        accordion = container.innerElement.createChild({
            tag: 'section',
            cls: 'accordion-section',
            cn: {
                tag: 'h1',
                cls: 'accordion-header',
                html: item.config.title
            }
        }, nextSiblingDom);

        accordionHeader = accordion.down('.accordion-header');

        accordionHeader.on({
            touchstart: function() {
                accordionHeader.addCls(pressedCls);
            },
            touchend: function() {
                accordionHeader.removeCls(pressedCls);
            }
        });

        if (item.isHidden()) {
            accordion.hide();
        }

        accordion.dom.appendChild(itemDom);

        accordion.item = item;
        item.accordion = accordion;

        return me;
    },

    removeInnerItem: function(item) {
        item.accordion.detach();
    },

    onHeaderTap: function(ev) {
        var item = ev.getTarget('.accordion-section', this.container.innerElement, true).item;

        if (item.collapsed) {
            item.expand();
        } else {
            item.collapse();
        }
    },

    applyExpandedItem: function(item) {
        if (!item && item !== 0) {
            return null;
        }

        if (item.isElement) {
            return item.item;
        }

        if (Ext.isNumber(item)) {
            return this.container.getInnerAt(item);
        }

        return item;
    },

    updateExpandedItem: function(item, oldItem) {
        if (oldItem && !this.container.config.allowMultipleExpandedItems) {
            oldItem.collapse();
        }

        if (item && item.isPainted()) {
            item.expand();
        }
    },

    onItemAdd: function(item) {
        var me = this;

        me.callParent(arguments);

        item.expand = function() {
            if (item.collapsed && item.fireEvent('beforeexpand', item, me) !== false) {
                item.collapsed = false;
                item.fireEvent('expand', item, me);
            }
        };

        item.collapse = function() {
            if (!item.collapsed && item.fireEvent('beforecollapse', item, me) !== false) {
                item.collapsed = true;
                item.fireEvent('collapse', item, me);
            }
        };

        if (item.config.expanded) {
            me.setExpandedItem(item);
            item.collapsed = false;
            item.accordion.addCls('is-expanded');
        } else {
            item.collapsed = true;
        }
    },

    onItemHide: function(item) {
        if (item.isInnerItem()) {
            item.accordion.hide();
        }
    },

    onItemShow: function(item) {
        if (item.isInnerItem()) {
            item.accordion.show();
        }
    },

    onItemExpand: function(item) {
        var me = this,
            container = me.findParentContainerWithScrollable(),
            scroller = container.getScrollable();

        me.setExpandedItem(item);

        if (item && me.shouldItemBeMaximized(item)) {
            item.setHeight(container.bodyElement.getHeight() - me.getTotalHeight(container));
            if (scroller) {
                scroller.setDisabled(true);
            }
        } else if (scroller) {
            scroller.setDisabled(false);

            if (me.getScrollOnExpand()) {
                Ext.defer(function() {
                    var scrollToY = me.getHeaderScrollPosition(item);

                    if (scroller.getSize().y - scroller.getContainerSize().y > scrollToY) {
                        scroller.scrollTo(0, scrollToY, true);
                    }
                }, 25);
            }
        }

        item.accordion.addCls('is-expanded');
    },

    onItemCollapse: function(item) {
        var me = this;

        if (me.getExpandedItem() === item) {
            me.setExpandedItem(null);
        }

        item.accordion.removeCls('is-expanded');
    },

    /**
     * certain functions depend on working with a container that has a scrollable/scroller;
     * since it's possible that an accordion might exist as a child of a parent container
     * that has scrollable (instead of the accordion container being the entire scrollable area),
     * we can use this function to locate the nearest parent with a scrollable.
     */
    findParentContainerWithScrollable: function() {
        var container = this.container;

        return container.up('container{getScrollable()}') || container;
    },

    /**
     * Test if given item should be maximized
     */
    shouldItemBeMaximized: function(item) {
        var me = this,
            container = me.findParentContainerWithScrollable();

        return !container.getScrollable().getElement().getHeight() || !!item.config.maximizeHeight;
    },

    getTotalHeight: function(container) {
        var innerItems = container.getInnerItems(),
            len = innerItems.length,
            i = 0,
            totalHeight = 0,
            containerItem;

        if (container === this.container) {
            for (; i < len; i++) {
                containerItem = innerItems[i];
                if (!containerItem.getHidden()) {
                    totalHeight += containerItem.accordion.getHeight();
                }
            }
        }

        return totalHeight;
    },

    getHeaderScrollPosition: function(item) {
        var innerItems = this.container.getInnerItems(),
            index = Ext.Array.indexOf(innerItems, item) - 1,
            top = 0;

        while (index >= 0) {
            top += innerItems[index].accordion.getHeight();
            index--;
        }

        return top;
    }
});
