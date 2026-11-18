// static/js/components/Login.js
// Common login form component for Admin, Examiner, and Student roles.

const Login = {
    data() {
        return {
            email: "",
            password: "",
            errorMessage: "",
            loading: false
        };
    },
    methods: {
        async handleLogin() {
            this.errorMessage = "";
            this.loading = true;
            try {
                const response = await window.API.post("/api/auth/login", {
                    email: this.email,
                    password: this.password
                });
                
                window.API.setAuth(response);

                // Redirect based on role
                if (response.role === "admin") {
                    this.$router.push("/admin/dashboard");
                } else if (response.role === "examiner") {
                    this.$router.push("/examiner/dashboard");
                } else if (response.role === "student") {
                    this.$router.push("/student/dashboard");
                } else {
                    this.$router.push("/");
                }
            } catch (error) {
                this.errorMessage = error.message || "Failed to log in. Please try again.";
            } finally {
                this.loading = false;
            }
        }
    },
    template: `
    <div class="row justify-content-center mt-5">
        <div class="col-md-5 col-lg-4">
            <div class="card shadow-sm">
                <div class="card-body p-4">
                    <h3 class="card-title text-center mb-4 fw-bold text-primary">EMP-V2 Login</h3>

                    <div v-if="errorMessage" class="alert alert-danger py-2 small" role="alert">
                        {{ errorMessage }}
                    </div>

                    <form @submit.prevent="handleLogin">
                        <div class="mb-3">
                            <label class="form-label">Email Address</label>
                            <input
                                type="email"
                                class="form-control"
                                v-model="email"
                                placeholder="name@emp.com"
                                required
                            />
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Password</label>
                            <input
                                type="password"
                                class="form-control"
                                v-model="password"
                                placeholder="Enter password"
                                required
                            />
                        </div>

                        <div class="d-grid mb-3">
                            <button type="submit" class="btn btn-primary" :disabled="loading">
                                <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                                Login
                            </button>
                        </div>
                    </form>

                    <div class="text-center mt-3 small text-muted">
                        Are you a student? 
                        <router-link to="/register" class="text-primary text-decoration-none">
                            Register here
                        </router-link>
                    </div>

                    <div class="mt-4 pt-3 border-top small text-muted text-center">
                        <div><strong>Demo Admin:</strong> admin@emp.com / Admin@123</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
};

window.Login = Login;
