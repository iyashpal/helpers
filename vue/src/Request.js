import Axios from 'axios'

export default function HttpRequest(method = 'GET', url = "", data, options = {}) {


    let _defaults = Object.assign({
        url,
        method,
        data,
        headers: {},
        errorBag: '',
        methodSpoofing: true,
        onCancelToken: () => { },
        onStart: () => { },
        onProgress: () => { },
        onFinish: () => { },
        onCancel: () => { },
        onSuccess: () => { },
        onError: () => { },
    }, options)


    // Convert simple data to form data.
    if (hasFiles(_defaults.data) && !(_defaults.data instanceof FormData)) {

        _defaults.data = objectToFormData(_defaults.data)


        if (['PUT', 'PATCH'].includes(method) && _defaults.methodSpoofing) {

            _defaults.method = "POST";

            _defaults.data.append('_method', method.toLowerCase());

        }

    }


    // _defaults.data.append('_method', 'patch');

    if (method === 'delete') {

        return Axios.delete(url, { ...options })

    } else {
        // Start the request
        _defaults.onStart()

        return Axios({

            ..._defaults,

            data: method === 'GET' ? {} : _defaults.data,

            params: method === 'GET' ? _defaults.data : {},

            headers: {
                ..._defaults.headers,

                'X-Requested-With': 'XMLHttpRequest',
            },

            onUploadProgress: progress => {
                if (ObjToFormData instanceof FormData) {
                    progress.percentage = Math.round(progress.loaded / progress.total * 100)
                    _defaults.onProgress(progress)
                }
            },

        }).then(response => {

            _defaults.onSuccess(response)

            return Promise.resolve(response)

        }).catch(error => {

            let { response: { data: { errors } } } = error

            let scopedErrors = _defaults.errorBag ? (errors[_defaults.errorBag] ? errors[_defaults.errorBag] : {}) : errors;

            if (errors && typeof scopedErrors === 'object') {
                scopedErrors = mapScopedErrors(scopedErrors)
            }

            _defaults.onError(scopedErrors, error)

            return Promise.reject(scopedErrors, error);

        }).then(response => {

            _defaults.onFinish(response)

            return Promise.resolve(response);
        });
    }
}


function mapScopedErrors(scopedErrors = {}) {

    let errors = {};

    for (const key in scopedErrors) {

        if (Array.isArray(scopedErrors[key])) {

            errors[key] = scopedErrors[key].shift();

        }

    }

    return errors;

}


function objectToFormData(source, form = new FormData(), parentKey = null) {
    source = source || {}

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            append(form, composeKey(parentKey, key), source[key])
        }
    }

    return form
}

function composeKey(parent, key) {
    return parent ? parent + '[' + key + ']' : key
}

function append(form, key, value) {

    if (Array.isArray(value)) {
        return Array.from(value.keys()).forEach(
            index => append(form, composeKey(key, index.toString()), value[index])
        )

    } else if (value instanceof Date) {

        return form.append(key, value.toISOString())

    } else if (value instanceof File) {

        return form.append(key, value, value.name)

    } else if (value instanceof Blob) {

        return form.append(key, value)

    } else if (typeof value === 'boolean') {

        return form.append(key, value ? '1' : '0')

    } else if (typeof value === 'string') {

        return form.append(key, value)

    } else if (typeof value === 'number') {

        return form.append(key, `${value}`)

    } else if (value === null || value === undefined) {

        return form.append(key, '')

    }

    objectToFormData(value, form, key)
}


function hasFiles(data) {
    return (
        data instanceof File ||
        data instanceof Blob ||
        (data instanceof FileList && data.length > 0) ||
        (data instanceof FormData && Array.from(data.values()).some((value) => hasFiles(value))) ||
        (typeof data === 'object' && data !== null && Object.values(data).some((value) => hasFiles(value)))
    )
}
