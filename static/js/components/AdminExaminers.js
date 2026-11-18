// static/js/components/AdminExaminers.js
// Admin examiner management component.
// Handles adding new examiners (with auto-generated passwords sent via email) and toggling active status.

const AdminExaminers = {
    props: ["searchQuery"],
    data() {
        return {
            examiners: [],
            loading: false,
            errorMessage: "",
            successMessage: "",
            showForm: false,
            form: {
                email: "",
                full_name: "",
                phone: "",
                department: ""
            }
        };
    },
    computed: {
        filteredExaminers() {
            if (!this.searchQuery) return this.examiners;
            const q = this.searchQuery.toLowerCase();
            return this.examiners.filter(e => 
                e.full_name.toLowerCase().includes(q) || 
                e.email.toLowerCase().includes(q) || 
                (e.department && e.department.toLowerCase().includes(q))
            );
        }
    },
    watch: {
        searchQuery(newVal) {
            this.fetchExaminers(newVal);
        }
    },
    mounted() {
        this.fetchExaminers();
    },
    methods: {
        async fetchExaminers(query = "") {
            this.loading = true;
            try {
                const url = query ? `/api/admin/examiners?q=${encodeURIComponent(query)}` : "/api/admin/examiners";
                this.examiners = await window.API.get(url);
            } catch (err) {
                this.errorMessage = err.message || "Failed to load examiners";
            } finally {
                this.loading = false;
            }
        },
        openCreateForm() {
            this.form = { email: "", full_name: "", phone: "", department: "" };
            this.showForm = true;
            this.errorMessage = "";
            this.successMessage = "";
        },
        async saveExaminer() {
            this.errorMessage = "";
            this.successMessage = "";
            try {
                const res = await window.API.post("/api/admin/examiners", this.form);
                this.successMessage = res.message || "Examiner added successfully! Credentials sent to their email.";
                this.showForm = false;
                this.fetchExaminers();
            } catch (err) {
                this.errorMessage = err.message || "Failed to add examiner";
            }
        },
        async toggleStatus(examiner) {
            this.errorMessage = "";
            this.successMessage = "";
            try {
                const res = await window.API.put(`/api/admin/examiners/${examiner.id}/toggle-status`);
                this.successMessage = res.message;
                this.fetchExaminers();
            } catch (err) {
                this.errorMessage = err.message || "Failed to update examiner status";
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Examiner Management</h3>
                <p class="text-muted small">Register faculty examiners and manage account approvals</p>
            </div>
            <button class="btn btn-primary" @click="openCreateForm" v-if="!showForm">+ Add Examiner</button>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>

        <!-- Inline Add Examiner Form -->
        <div class="card mb-4 border-primary" v-if="showForm">
            <div class="card-header bg-light fw-bold">Register New Examiner</div>
            <div class="card-body">
                <form @submit.prevent="saveExaminer">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">Full Name <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" v-model="form.full_name" required placeholder="Dr. S. Raman" />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Email Address (Login) <span class="text-danger">*</span></label>
                            <input type="email" class="form-control" v-model="form.email" required placeholder="examiner@emp.com" />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Phone Number (10 digits)</label>
                            <input type="tel" class="form-control" v-model="form.phone" placeholder="9876543210" maxlength="10" />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Department / School</label>
                            <input type="text" class="form-control" v-model="form.department" placeholder="Computer Science & Engineering" />
                        </div>
                    </div>
                    <div class="mt-3 text-end">
                        <button type="button" class="btn btn-secondary me-2" @click="showForm = false">Cancel</button>
                        <button type="submit" class="btn btn-success">Save & Email Credentials</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Examiners Table -->
        <div class="card">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Examiner Name</th>
                            <th>Email (Username)</th>
                            <th>Department</th>
                            <th>Phone</th>
                            <th>Status</th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading"><td colspan="6" class="text-center py-4 text-muted">Loading examiners...</td></tr>
                        <tr v-else-if="filteredExaminers.length === 0"><td colspan="6" class="text-center py-4 text-muted">No examiners found</td></tr>
                        <tr v-for="ex in filteredExaminers" :key="ex.id">
                            <td class="fw-bold">{{ ex.full_name }}</td>
                            <td>{{ ex.email }}</td>
                            <td>{{ ex.department || '-' }}</td>
                            <td>{{ ex.phone || '-' }}</td>
                            <td>
                                <span class="badge" :class="ex.is_active ? 'bg-success' : 'bg-danger'">
                                    {{ ex.is_active ? 'Approved' : 'Deactivated' }}
                                </span>
                            </td>
                            <td class="text-end">
                                <button class="btn btn-sm" :class="ex.is_active ? 'btn-outline-danger' : 'btn-outline-success'" @click="toggleStatus(ex)">
                                    {{ ex.is_active ? 'Deactivate' : 'Approve' }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `
};

window.AdminExaminers = AdminExaminers;
