// static/js/api.js
// Centralized fetch wrapper for EMP-V2.
// Automatically attaches JWT Authorization headers and manages authentication state.

const API = {
    getToken() {
        return localStorage.getItem("emp_token") || null;
    },

    getUser() {
        return {
            role: localStorage.getItem("emp_role") || null,
            name: localStorage.getItem("emp_name") || "",
            email: localStorage.getItem("emp_email") || "",
            id: localStorage.getItem("emp_user_id") || null
        };
    },

    setAuth(authData) {
        localStorage.setItem("emp_token", authData.token);
        localStorage.setItem("emp_role", authData.role);
        localStorage.setItem("emp_name", authData.name);
        localStorage.setItem("emp_email", authData.email || "");
        localStorage.setItem("emp_user_id", authData.user_id || "");
    },

    clearAuth() {
        localStorage.removeItem("emp_token");
        localStorage.removeItem("emp_role");
        localStorage.removeItem("emp_name");
        localStorage.removeItem("emp_email");
        localStorage.removeItem("emp_user_id");
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    async request(url, options = {}) {
        const headers = { ...options.headers };
        const token = this.getToken();

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        if (options.body && !(options.body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(options.body);
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            let data = {};
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                data = await response.json();
            }

            if (!response.ok) {
                if (response.status === 401 && !url.includes("/auth/login")) {
                    this.clearAuth();
                    window.location.hash = "#/login";
                }
                const errorMessage = data.message || `Request failed with status ${response.status}`;
                const err = new Error(errorMessage);
                err.status = response.status;
                err.data = data;
                throw err;
            }

            return data;
        } catch (error) {
            console.error(`API Error [${url}]:`, error.message);
            throw error;
        }
    },

    get(url) {
        return this.request(url, { method: "GET" });
    },

    post(url, body) {
        return this.request(url, { method: "POST", body });
    },

    put(url, body) {
        return this.request(url, { method: "PUT", body });
    },

    delete(url) {
        return this.request(url, { method: "DELETE" });
    }
};

window.API = API;
