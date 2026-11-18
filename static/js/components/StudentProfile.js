// static/js/components/StudentProfile.js
// Student profile view and personal information update component.

const StudentProfile = {
    data() {
        return {
            profile: null,
            loading: false,
            errorMessage: "",
            successMessage: "",
            isEditing: false,
            form: {
                phone: "",
                department: ""
            }
        };
    },
    mounted() {
        this.fetchProfile();
    },
    methods: {
        async fetchProfile() {
            this.loading = true;
            try {
                this.profile = await window.API.get("/api/student/profile");
                this.form.phone = this.profile.phone || "";
                this.form.department = this.profile.department || "";
            } catch (err) {
                this.errorMessage = err.message || "Failed to load profile";
            } finally {
                this.loading = false;
            }
        },
        async saveProfile() {
            this.errorMessage = "";
            this.successMessage = "";
            try {
                const res = await window.API.put("/api/student/profile", this.form);
                this.successMessage = res.message || "Profile updated successfully";
                this.profile = res.user;
                this.isEditing = false;
            } catch (err) {
                this.errorMessage = err.message || "Failed to update profile";
            }
        }
    },
    template: `
    <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3 class="fw-bold text-dark mb-0">Candidate Profile</h3>
                <button class="btn btn-outline-primary btn-sm" @click="isEditing = !isEditing" v-if="profile">
                    {{ isEditing ? 'Cancel Edit' : 'Edit Details' }}
                </button>
            </div>

            <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>
            <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>

            <div class="card shadow-sm" v-if="profile">
                <div class="card-body p-4">
                    <div class="text-center mb-4 pb-3 border-bottom">
                        <div class="fs-1 text-primary"><i class="bi bi-person-circle"></i></div>
                        <h4 class="fw-bold mb-1">{{ profile.full_name }}</h4>
                        <div class="text-muted small">{{ profile.email }}</div>
                        <span class="badge bg-info text-dark mt-2">Student ID: #{{ profile.id }}</span>
                    </div>

                    <!-- View Mode -->
                    <div v-if="!isEditing">
                        <div class="row g-3">
                            <div class="col-6">
                                <label class="text-muted small">Department / Program</label>
                                <div class="fw-bold">{{ profile.department || 'Not Specified' }}</div>
                            </div>
                            <div class="col-6">
                                <label class="text-muted small">Contact Phone</label>
                                <div class="fw-bold">{{ profile.phone || 'Not Specified' }}</div>
                            </div>
                            <div class="col-6">
                                <label class="text-muted small">Account Role</label>
                                <div><span class="badge bg-secondary">{{ profile.role }}</span></div>
                            </div>
                            <div class="col-6">
                                <label class="text-muted small">Registered Date</label>
                                <div class="fw-bold">{{ profile.created_at ? profile.created_at.split('T')[0] : '-' }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Edit Form -->
                    <form @submit.prevent="saveProfile" v-else>
                        <div class="mb-3">
                            <label class="form-label">Phone Number (10 digits)</label>
                            <input type="tel" class="form-control" v-model="form.phone" maxlength="10" placeholder="9876543210" />
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Department / Degree Program</label>
                            <input type="text" class="form-control" v-model="form.department" placeholder="e.g. BS Data Science" />
                        </div>
                        <div class="d-grid mt-4">
                            <button type="submit" class="btn btn-primary">Save Profile Changes</button>
                        </div>
                    </form>
                </div>
            </div>
            <div v-else-if="loading" class="text-center py-5 text-muted">Loading candidate profile...</div>
        </div>
    </div>
    `
};

window.StudentProfile = StudentProfile;
