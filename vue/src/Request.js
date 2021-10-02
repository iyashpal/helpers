import Axios from 'axios'

export default {
    
    get(url, data, options) {
        return sendRequest({ url, method: 'get', data, ...options })
    },

    post(url, data, options) {
        return sendRequest({ url, method: 'post', data, ...options })
    },

    put(url, data, options) {
        return sendRequest({ url, method: 'put', data, ...options })
    },

    patch(url, data, options) {
        return sendRequest({ url, method: 'patch', data, ...options })
    },

    delete(url, options) {
        return sendRequest({ url, method: "delete", ...options })
    },
}


function sendRequest(options = {}) {
    let defaults = {
        url: "",
        method: "get",
        data: {},
        headers: {},
        errorBag: '',
        onCancelToken: () => { },
        onStart: () => { },
        onProgress: () => { },
        onFinish: () => { },
        onCancel: () => { },
        onSuccess: () => { },
        onError: () => { },
    }


    Object.assign(defaults, options)

    // Convert simple data to form data.
    if (!(defaults.data instanceof FormData)) {
        defaults.data = objectToFormData(defaults.data)
    }

    // Start the request
    defaults.onStart()

    return Axios({
        url: defaults.url,
        method: defaults.method,
        data: defaults.method === 'get' ? {} : defaults.data,
        params: defaults.method === 'get' ? defaults.data : {},
        headers: {
            ...defaults.headers,
            'X-Requested-With': "XMLHttpRequest",
        },

        onUploadProgress: progress => {
            if (defaults.data instanceof FormData) {
                progress.percentage = Math.round(progress.loaded / progress.total * 100)
                defaults.onProgress(progress)
            }
        },
    }).then(response => {

        defaults.onSuccess(response)

        return Promise.resolve(response)

    }).catch(error => {

        let { response: { data: { errors } } } = error

        let scopedErrors = defaults.errorBag ? (errors[defaults.errorBag] ? errors[defaults.errorBag] : {}) : errors;

        if (errors && typeof scopedErrors === 'object') {
            scopedErrors = mapScopedErrors(scopedErrors)
        }

        defaults.onError(scopedErrors, error)

        return Promise.reject(scopedErrors, error);

    }).then(response => {

        defaults.onFinish(response)

        return Promise.resolve(response);
    })

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
