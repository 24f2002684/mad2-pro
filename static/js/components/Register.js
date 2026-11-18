// static/js/components/Register.js
// Student self-registration form component.

const Register = {
    data() {
        return {
            fullName: "",
            email: "",
            password: "",
            phone: "",
            department: "",
            errorMessage: "",
            successMessage: "",
            loading: false
        };
    },
    methods: {
        async handleRegister() {
            this.errorMessage = "";
            this.successMessage = "";

            if (this.phone && (this.phone.length !== 10 || !/^\d+$/.test(this.phone))) {
                this.errorMessage = "Phone number must be exactly 10 digits";
                return;
            }

            this.loading = true;
            try {
                const response = await window.API.post("/api/auth/register", {
                    full_name: this.fullName,
                    email: this.email,
                    password: this.password,
                    phone: this.phone,
                    department: this.department
                });

                this.successMessage = response.message || "Registration successful! Redirecting to login...";
                setTimeout(() => {
                    this.$router.push("/login");
                }, 1500);
            } catch (error) {
                this.errorMessage = error.message || "Registration failed. Please check your details.";
            } finally {
                this.loading = false;
            }
        }
    },
    template: `
    <div class="row justify-content-center mt-4">
        <div class="col-md-6 col-lg-5">
            <div class="card shadow-sm">
                <div class="card-body p-4">
                    <h3 class="card-title text-center mb-4 fw-bold text-primary">Student Registration</h3>

                    <div v-if="errorMessage" class="alert alert-danger py-2 small" role="alert">
                        {{ errorMessage }}
                    </div>
                    <div v-if="successMessage" class="alert alert-success py-2 small" role="alert">
                        {{ successMessage }}
                    </div>

                    <form @submit.prevent="handleRegister">
                        <div class="mb-3">
                            <label class="form-label">Full Name <span class="text-danger">*</span></label>
                            <input
                                type="text"
                                class="form-control"
                                v-model="fullName"
                                placeholder="Student Full Name"
                                required
                            />
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Email Address <span class="text-danger">*</span></label>
                            <input
                                type="email"
                                class="form-control"
                                v-model="email"
                                placeholder="student@example.com"
                                required
                            />
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Password <span class="text-danger">*</span></label>
                            <input
                                type="password"
                                class="form-control"
                                v-model="password"
                                placeholder="Minimum 6 characters"
                                minlength="6"
                                required
                            />
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Phone Number (10 digits)</label>
                            <input
                                type="tel"
                                class="form-control"
                                v-model="phone"
                                placeholder="9876543210"
                                maxlength="10"
                            />
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Department / Program</label>
                            <input
                                type="text"
                                class="form-control"
                                v-model="department"
                                placeholder="e.g. BS Data Science / Applications"
                            />
                        </div>

                        <div class="d-grid mb-3">
                            <button type="submit" class="btn btn-primary" :disabled="loading">
                                <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                                Register Account
                            </button>
                        </div>
                    </form>

                    <div class="text-center mt-3 small text-muted">
                        Already have an account? 
                        <router-link to="/login" class="text-primary text-decoration-none">
                            Login here
                        </router-link>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
};

window.Register = Register;
