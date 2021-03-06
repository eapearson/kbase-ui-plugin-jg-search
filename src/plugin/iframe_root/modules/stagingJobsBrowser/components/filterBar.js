define([
    'kb_knockout/registry',
    'kb_knockout/lib/generators',
    'kb_lib/html',
    './jobStatusFilter'
], function (
    reg,
    gen,
    html,
    JobStatusFilterComponent
) {
    'use strict';

    var t = html.tag,
        span = t('span'),
        label = t('label'),
        div = t('div');

    class ViewModel {
        constructor(params) {
            this.jobStatusFilter = params.search.jobStatusFilter;
        }
    }

    var styles = html.makeStyles({
        filterLabel: {
            fontWeight: 'bold',
            color: 'gray',
            marginTop: '8px',
            fontSize: '80%'
        },
        component: {
            flex: '1 1 0px',
            display: 'flex',
            flexDirection: 'column'
        },
        searchArea: {
            flex: '0 0 50px',
        },
        activeFilterInput: {
            backgroundColor: 'rgba(209, 226, 255, 1)',
            color: '#000'
        },
        modifiedFilterInput: {
            backgroundColor: 'rgba(255, 245, 158, 1)',
            color: '#000'
        }
    });

    function buildFilterArea() {
        return div({
            class: 'form-inline',
            style: {
                display: 'inline-block'
            }
        }, [
            span({
                class: [styles.classes.filterLabel]
            }, 'Filters: '),
            div({
                style: {
                    display: 'inline-block',
                    marginLeft: '12px'
                }
            }, [
                label('Job Status '),

                gen.component({
                    name: JobStatusFilterComponent.name(),
                    params: {
                        jobStatusFilter: 'jobStatusFilter'
                    }
                })
            ]),

        ]);
    }

    function template() {
        return buildFilterArea();
    }

    function component() {
        return {
            viewModel: ViewModel,
            template: template(),
            stylesheet: styles.sheet
        };
    }

    return reg.registerComponent(component);
});