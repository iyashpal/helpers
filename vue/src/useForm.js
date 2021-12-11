import isEqual from 'lodash.isequal'
import { reactive, watch } from 'vue'
import HttpRequest from './Request.js'
import cloneDeep from 'lodash.clonedeep'

export default function useForm(...args) {
    const rememberKey = typeof args[0] === 'string' ? args[0] : null

    const data = (typeof args[0] === 'string' ? args[1] : args[0]) || {}

    let defaults = cloneDeep(data)

    let cancelToken = null

    let recentlySuccessfulTimeoutId = null

    let transform = data => data

    let form = reactive({

        ...data,

        isDirty: false,

        errors: {},

        hasErrors: false,

        processing: false,

        progress: null,

        wasSuccessful: false,

        recentlySuccessful: false,

        data() {
            return Object.keys(data).reduce((carry, key) => {
                carry[key] = this[key]
                return carry
            }, {})
        },

        transform(callback) {
            transform = callback

            return this
        },

        reset(...fields) {

            let clonedDefaults = cloneDeep(defaults)

            if (fields.length === 0) {

                Object.assign(this, clonedDefaults)

            } else {
                Object.assign(this, Object.keys(clonedDefaults)
                    .filter(key => fields.includes(key))
                    .reduce((carry, key) => {
                        carry[key] = clonedDefaults[key]
                        return carry
                    }, {}),
                )
            }

            return this
        },

        clearErrors(...fields) {
            this.errors = Object.keys(this.errors)
                .reduce((carry, field) => ({
                    ...carry,
                    ...(fields.length > 0 && !fields.includes(field) ? { [field]: this.errors[field] } : {}),
                }), {})

            this.hasErrors = Object.keys(this.errors).length > 0

            return this
        },

        submit(method, url, options = {}) {

            const data = transform(this.data())

            const _options = {

                ...options,

                onCancelToken: (token) => {

                    cancelToken = token

                    if (options.onCancelToken) {
                        return options.onCancelToken(token)
                    }
                },

                onStart: () => {

                    this.processing = true

                    this.wasSuccessful = false

                    this.recentlySuccessful = false

                    clearTimeout(recentlySuccessfulTimeoutId)

                    if (options.onStart) {
                        options.onStart()
                    }
                },


                onProgress: event => {
                    this.progress = event

                    if (options.onProgress) {
                        return options.onProgress(event)
                    }
                },

                onSuccess: response => {

                    this.processing = false

                    this.progress = null

                    this.clearErrors()

                    this.wasSuccessful = true

                    this.recentlySuccessful = true

                    recentlySuccessfulTimeoutId = setTimeout(() => this.recentlySuccessful = false, 2000)

                    if (options.onSuccess) {
                        options.onSuccess(response)
                    }

                    defaults = cloneDeep(this.data())

                    this.isDirty = false

                    return Promise.resolve(response);
                },

                onError: (errors, error) => {
                    this.progress = null
                    this.errors = errors
                    this.hasErrors = true
                    this.processing = false

                    if (options.onError) {
                        options.onError(errors, error)
                    }

                    return Promise.reject(errors, error)

                },

                onCancel: () => {
                    this.progress = null
                    this.processing = false

                    if (options.onCancel) {
                        return options.onCancel()
                    }
                },

                onFinish: response => {
                    this.processing = false
                    this.progress = null
                    cancelToken = null

                    if (options.onFinish) {
                        options.onFinish(response);
                    }
                },
            }

            return HttpRequest(method, url, data, _options)

        },

        get(url, options) {
            return this.submit('GET', url, options)
        },

        post(url, options) {
            return this.submit('POST', url, options)
        },

        put(url, options) {
            return this.submit('PUT', url, options)
        },

        patch(url, options) {
            return this.submit('PATCH', url, options)
        },

        delete(url, options) {
            return this.submit('DELETE', url, options)
        },

        cancel() {
            if (cancelToken) {
                cancelToken.cancel()
            }
        },

        __rememberable: rememberKey === null,

        __remember() {
            return { data: this.data(), errors: this.errors }
        },

    })

    watch(form, () => {
        form.isDirty = !isEqual(form.data(), defaults)
    }, { immediate: true, deep: true })

    return form
}
