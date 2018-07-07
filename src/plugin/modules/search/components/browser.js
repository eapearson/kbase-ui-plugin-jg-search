define([
    'knockout',
    'kb_knockout/registry',
    'kb_knockout/lib/generators',
    'kb_knockout/lib/viewModelBase',
    'kb_common/html',
    './result',
    '../../components/stagingStatusViewer'
], function (
    ko,
    reg,
    gen,
    ViewModelBase,
    html,
    SearchResultComponent,
    StagingStatusViewerComponent
) {
    'use strict';

    const t = html.tag,
        span = t('span'),
        div = t('div'),
        button = t('button'),
        input = t('input'),
        select = t('select');

    // ko.extenders.parsed = function (target, parseFun) {
    //     target.parsed = ko.observable();
    //     target.parseError = ko.observable();

    //     function parseit(newValue) {
    //         try {
    //             target.parsed(parseFun(newValue));
    //         } catch (ex) {
    //             target.parseError(ex.message);
    //             console.error('Error parsing : ' + ex.message);
    //         }
    //     }
    //     target.subscribe(function (newValue) {
    //         parseit(newValue);
    //     });
    //     parseit(target());
    //     return target;
    // };

    // NB: hmm, it looks like the params are those active in the tab which spawned
    // this component...
    class ViewModel extends ViewModelBase {
        constructor(params, componentInfo) {
            super(params);

            const context = ko.contextFor(componentInfo.element);

            this.runtime = context.$root.runtime;

            // From parent search component.
            this.search = params.search;
            this.totalCount = this.search.searchTotal;
            this.actualTotalCount = this.search.actualSearchTotal;
            this.searching = this.search.searching;
            this.pageSize = this.search.pageSize;
            this.page = this.search.page;

            this.pageFrom = ko.pureComputed(() => {
                if (!this.page()) {
                    return '';
                }

                return (this.page() - 1) * this.pageSize() + 1;
            });

            this.pageTo = ko.pureComputed(() => {
                if (!this.page()) {
                    return '';
                }
                return Math.min(this.page() * this.pageSize(), this.totalCount());
            });

            this.pageSizeInput = ko.pureComputed(() => {
                return String(this.pageSize());
            });

            // Our own, for now. Since these are overall properties of the
            // search capabilities, they should be foisted up to the search as well.

            // SORTING
            this.sortBy = ko.observable();

            // TODO: these need to come from the type
            this.sortFields = [];
            this.sortFieldsMap = {};
            this.sortFields.forEach((sortField) => {
                this.sortFieldsMap[sortField.key] = sortField;
            });
            this.currentSortField = ko.pureComputed(() => {
                // The "natural" sort order is simply an empty string which we translate
                // into a null.
                const sortKey = this.sortBy();
                if (!sortKey || sortKey.length === 0) {
                    return null;
                }
                return this.sortFieldsMap[this.sortBy()];
            });

            this.subscribe(this.currentSortField, () => {
                params.search.doSearch();
            });

            this.sortDirection = ko.observable('ascending');
            this.sortDirections = [{
                value: 'ascending',
                label: 'Ascending'
            }, {
                value: 'descending',
                label: 'Descending'
            }];

            this.sortDescending = ko.pureComputed(() => {
                return (this.sortDirection() === 'descending');
            });

            this.subscribe(this.sortDescending, () => {
                params.search.doSearch();
            });

            this.totalPages = ko.pureComputed(() => {
                if (!this.search.searchTotal()) {
                    return 0;
                }
                const size = this.search.searchTotal() / this.pageSize();
                return Math.ceil(size);
            });

            // TODO: huh? shouldn't that be a pureComputed?
            this.pageInput = ko.observable(String(this.page()));
            this.pageInput.extend({
                rateLimit: {
                    timeout: 500,
                    method: 'notifyWhenChangesStop'
                }
            });

            this.subscribe(this.pageInput, (newValue) => {
                // If bad input, don't do anything.
                if (newValue === '' || newValue === undefined || newValue === null) {
                    return;
                } else if (isNaN(newValue)) {
                    return;
                }
                const value = parseInt(newValue);
                if (value > this.totalPages()) {
                    this.pageInput(this.totalPages());
                    return;
                }
                if (value < 1) {
                    this.pageInput(1);
                    return;
                }

                if (value !== this.page()) {
                    this.page(value);
                }
            });

            this.subscribe(this.page, (newValue) => {
                if (newValue !== parseInt(this.pageInput())) {
                    this.pageInput(String(newValue));
                }
            });

            this.pageValues = ko.pureComputed(() => {
                const values = [];
                if (this.totalPages() > 100) {
                    return values;
                }
                for (let i = 0; i < this.totalPages(); i += 1) {
                    values.push({
                        value: String(i + 1),
                        label: String(i + 1)
                    });
                }
                return values;
            });

            this.pageSizes = [5, 10, 20, 50, 100].map((value) => {
                return {
                    label: String(value),
                    value: String(value)
                };
            });
        }

        doFirst() {
            this.page(1);
        }

        doLast() {
            this.page(this.totalPages());
        }

        doPrevPage() {
            if (this.page() > 1) {
                this.page(this.page() - 1);
            }
        }

        doNextPage() {
            if (this.page() < this.totalPages()) {
                this.page(this.page() + 1);
            }
        }

        isSearchState(states) {
            const s = this.search.searchState();
            return states.some((state) => {
                return (state === s);
            });
        }

        doShowStagingStatus() {
            this.search.showOverlay({
                name: StagingStatusViewerComponent.name(),
                viewModel: {
                    stagingJobs: this.search.stagingJobs,
                    runtime: this.runtime
                }
            });
        }
    }

    function buildIcon(type) {
        return span({
            class: 'fa fa-' + type
        });
    }

    function buildResultsStatus() {
        return span({
            style: {
                display: 'inline-block',
                verticalAlign: 'middle',
                textAlign: 'center',
                margin: '6px 0 0 4px',
                float: 'none',
                height: '20px'
            },
            dataBind: {
                style: {
                    color: 'searching() ? "gray" : "black"'
                },
                ifnot: 'isSearchState(["none", "notfound"])'
            }
        }, [
            'Found ',
            span({
                dataBind: {
                    typedText: {
                        value: 'totalCount',
                        type: '"number"',
                        format: '"0,0"'
                    }
                },
                style: {
                    verticalAlign: 'middle'
                }
            }),
            gen.if('actualTotalCount() > totalCount()',
                span({
                    style: {
                        fontStyle: 'italic'
                    }
                }, [
                    ' (truncated from ',
                    span({
                        dataBind: {
                            typedText: {
                                value: 'actualTotalCount',
                                type: '"number"',
                                format: '"0,0"'
                            }
                        }
                    }),
                    ')'
                ])),
            ', showing ',
            span({
                dataBind: {
                    typedText: {
                        value: 'pageFrom()',
                        type: '"number"',
                        format: '"0,0"'
                    }
                }
            }),
            ' to ',
            span({
                dataBind: {
                    typedText: {
                        value: 'pageTo()',
                        type: '"number"',
                        format: '"0,0"'
                    }
                }
            })
        ]);
    }

    function buildPagingControls() {
        return div({
            class: 'btn-toolbar ' + styles.classes.toolbar
        }, [
            div({
                style: {
                    display: 'inline-block',
                    width: '66%',
                    verticalAlign: 'middle',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }
            }, [
                div({
                    class: 'btn-group form-inline',
                    style: {
                        margin: '0'
                    }
                }, [
                    div([
                        button({
                            dataBind: {
                                click: 'doFirst',
                                disable: '!page() || page() === 1 || searching()'
                            },
                            class: 'btn btn-default'
                        }, buildIcon('step-backward')),
                        button({
                            dataBind: {
                                click: 'doPrevPage',
                                disable: '!page() || page() === 1 || searching()'
                            },
                            class: 'btn btn-default'
                        }, buildIcon('chevron-left')),
                        button({
                            dataBind: {
                                click: 'doNextPage',
                                disable: '!page() || page() === totalPages() || searching()'
                            },
                            class: 'btn btn-default'
                        }, buildIcon('chevron-right')),
                        button({
                            dataBind: {
                                click: 'doLast',
                                disable: '!page() || page() === totalPages() || searching()'
                            },
                            class: 'btn btn-default'
                        }, buildIcon('step-forward')),

                        div({
                            style: {
                                display: 'inline-block',
                                verticalAlign: 'middle',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }
                        }, gen.if('totalPages() && totalPages() > 1', [
                            span({
                                style: {
                                    marginLeft: '6px'
                                }
                            }, 'page '),
                            gen.if('totalPages() <= 100',
                                select({
                                    dataBind: {
                                        value: 'pageInput',
                                        options: 'pageValues',
                                        optionsValue: '"value"',
                                        optionsText: '"label"'
                                    },
                                    class: 'form-control',
                                    style: {
                                        display: 'inline-block',
                                        width: '5em'
                                    }
                                }),
                                input({
                                    dataBind: {
                                        textInput: 'pageInput'
                                    },
                                    class: 'form-control',
                                    style: {
                                        display: 'inline-block',
                                        width: '5em'
                                    }
                                })),
                            span({
                                style: {
                                    marginLeft: '6px'
                                }
                            }, ' of '),
                            span({
                                dataBind: {
                                    text: 'totalPages()'
                                }
                            })
                        ]))
                    ])
                ])
            ]),

            div({
                style: {
                    display: 'inline-block',
                    width: '34%',
                    verticalAlign: 'middle',
                    textAlign: 'right',
                    paddingRight: '10px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }
            }, [
                buildResultsStatus()
            ])
        ]);
    }

    const styles = html.makeStyles({
        component: {
            css: {
                flex: '1 1 0px',
                display: 'flex',
                'flex-direction': 'column'
            }
        },
        controls: {
            css: {
                flex: '0 0 50px'
            }
        },
        toolbar: {
            css: {
                margin: '0',
            }
        },
        items: {
            css: {
                flex: '1 1 0px',
                display: 'flex',
                'flex-direction': 'column'
            }
        }
    });

    function template() {
        return div({
            class: styles.classes.component
        }, [
            div({
                class: styles.classes.controls
            }, buildPagingControls()),
            div({
                class: styles.classes.items,
                dataBind: {
                    component: {
                        name: SearchResultComponent.quotedName(),
                        params: {
                            search: 'search'
                        }
                    }
                }
            })
        ]);
    }

    function component() {
        return {
            viewModel: {
                createViewModel: (params, componentInfo) => {
                    return new ViewModel(params, componentInfo);
                }
            },
            template: template(),
            stylesheet: styles.sheet
        };
    }

    return reg.registerComponent(component);
});
