import $ from 'jquery';
import Flash from 'videojs-flash';

const videoEditor = (services) => {
    const {configService, localeService, recordEditorEvents} = services;
    let $container = null;
    let parentOptions = {};
    let data;
    let rangeCapture;
    let rangeCaptureInstance;
    let options = {
        playbackRates: [],
        fluid: true
    };
    const initialize = (params) => {
        let initWith = {$container, parentOptions, data} = params;
console.log('fdfdf');
        if (data.videoEditorConfig !== null) {
            options.seekBackwardStep = data.videoEditorConfig.seekBackwardStep;
            options.seekForwardStep = data.videoEditorConfig.seekForwardStep;
            options.playbackRates = data.videoEditorConfig.playbackRates === undefined ? [1, 2, 3] : data.videoEditorConfig.playbackRates;
            options.vttFieldValue = false;
            options.vttFieldValueWithImage = false;
            options.vttFieldName = data.videoEditorConfig.vttFieldName === undefined ? false : data.videoEditorConfig.vttFieldName;
            options.vttFieldNameWithImage = data.videoEditorConfig.vttFieldNameWithImage === undefined ? false : data.videoEditorConfig.vttFieldNameWithImage;
        }

        options.techOrder = ['html5', 'flash'];
        $container.addClass('video-range-editor-container');

        // get default videoTextTrack value
        if (options.vttFieldName !== false) {
            let vttField = parentOptions.fieldCollection.getFieldByName(options.vttFieldName);
            if (vttField !== false) {
                options.vttFieldValue = vttField._value
            }
        }

        if (options.vttFieldNameWithImage !== false) {
            let vttFieldWithImage = parentOptions.fieldCollection.getFieldByName(options.vttFieldNameWithImage);
            if (vttFieldWithImage !== false) {
                options.vttFieldValueWithImage = vttFieldWithImage._value
            }
        }

        require.ensure([], () => {

            // load videoJs lib
            rangeCapture = require('../../../videoEditor/rangeCapture').default;
            rangeCaptureInstance = rangeCapture(services);
            rangeCaptureInstance.initialize(params, options);

            // proxy resize event to rangeStream
            recordEditorEvents.listenAll({
                'recordEditor.uiResize': () => {
                    rangeCaptureInstance.getPlayer().rangeStream.onNext({action: 'resize'})
                }
            })


            rangeCaptureInstance.getPlayer().rangeStream.subscribe((params) => {
                switch (params.action) {
                    case 'export-vtt-ranges':
                        if (options.vttFieldName !== false) {

                            let presets = {
                                fields: {}
                            };
                            presets.fields[options.vttFieldName] = [params.data];
                            recordEditorEvents.emit('recordEditor.addPresetValuesFromDataSource', {
                                data: presets
                            });
                        }
                        break;
                        case 'export-vtt-ranges-with-image':
                        if (options.vttFieldNameWithImage !== false) {

                            let presets = {
                                fields: {}
                            };
                            presets.fields[options.vttFieldNameWithImage] = [params.data];
                            recordEditorEvents.emit('recordEditor.addPresetValuesFromDataSource', {
                                data: presets
                            });
                        }
                        break;
                    default:
                }
            });
        });
    };

    return {initialize};
};
export default videoEditor;
