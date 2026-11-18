// static/js/components/AdminStudents.js
// Admin student directory and account status management component.

const AdminStudents = {
    props: ["searchQuery"],
    data() {
        return {
            students: [],
            loading: false,
            errorMessage: "",
            successMessage: ""
        };
    },
    computed: {
        filteredStudents() {
            if (!this.searchQuery) return this.students;
            const q = this.searchQuery.toLowerCase();
            return this.students.filter(s => 
                s.full_name.toLowerCase().includes(q) || 
                s.email.toLowerCase().includes(q) || 
                (s.department && s.department.toLowerCase().includes(q))
            );
        }
    },
    watch: {
        searchQuery(newVal) {
            this.fetchStudents(newVal);
        }
    },
    mounted() {
        this.fetchStudents();
    },
    methods: {
        async fetchStudents(query = "") {
            this.loading = true;
            try {
                const url = query ? `/api/admin/students?q=${encodeURIComponent(query)}` : "/api/admin/students";
                this.students = await window.API.get(url);
            } catch (err) {
                this.errorMessage = err.message || "Failed to load students";
            } finally {
                this.loading = false;
            }
        },
        async toggleStatus(student) {
            this.errorMessage = "";
            this.successMessage = "";
            try {
                const res = await window.API.put(`/api/admin/students/${student.id}/toggle-status`);
                this.successMessage = res.message;
                this.fetchStudents();
            } catch (err) {
                this.errorMessage = err.message || "Failed to update student status";
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Student Directory</h3>
                <p class="text-muted small">View registered candidates and manage portal access</p>
            </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>

        <div class="card">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Student ID</th>
                            <th>Full Name</th>
                            <th>Email</th>
                            <th>Department</th>
                            <th>Phone</th>
                            <th>Account Status</th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading"><td colspan="7" class="text-center py-4 text-muted">Loading students...</td></tr>
                        <tr v-else-if="filteredStudents.length === 0"><td colspan="7" class="text-center py-4 text-muted">No students found</td></tr>
                        <tr v-for="s in filteredStudents" :key="s.id">
                            <td>#{{ s.id }}</td>
                            <td class="fw-bold">{{ s.full_name }}</td>
                            <td>{{ s.email }}</td>
                            <td>{{ s.department || '-' }}</td>
                            <td>{{ s.phone || '-' }}</td>
                            <td>
                                <span class="badge" :class="s.is_active ? 'bg-success' : 'bg-danger'">
                                    {{ s.is_active ? 'Active' : 'Blocked' }}
                                </span>
                            </td>
                            <td class="text-end">
                                <button class="btn btn-sm" :class="s.is_active ? 'btn-outline-danger' : 'btn-outline-success'" @click="toggleStatus(s)">
                                    {{ s.is_active ? 'Block Access' : 'Unblock Access' }}
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

window.AdminStudents = AdminStudents;
