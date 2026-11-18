// static/js/components/AdminCourses.js
// Admin course management component (CRUD with inline forms).

const AdminCourses = {
    props: ["searchQuery"],
    data() {
        return {
            courses: [],
            loading: false,
            errorMessage: "",
            successMessage: "",
            showForm: false,
            isEditing: false,
            form: {
                id: null,
                code: "",
                name: "",
                description: "",
                status: "Active"
            }
        };
    },
    computed: {
        filteredCourses() {
            if (!this.searchQuery) return this.courses;
            const q = this.searchQuery.toLowerCase();
            return this.courses.filter(c => 
                c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
            );
        }
    },
    watch: {
        searchQuery(newVal) {
            this.fetchCourses(newVal);
        }
    },
    mounted() {
        this.fetchCourses();
    },
    methods: {
        async fetchCourses(query = "") {
            this.loading = true;
            try {
                const url = query ? `/api/admin/courses?q=${encodeURIComponent(query)}` : "/api/admin/courses";
                this.courses = await window.API.get(url);
            } catch (err) {
                this.errorMessage = err.message || "Failed to load courses";
            } finally {
                this.loading = false;
            }
        },
        openCreateForm() {
            this.isEditing = false;
            this.form = { id: null, code: "", name: "", description: "", status: "Active" };
            this.showForm = true;
            this.errorMessage = "";
            this.successMessage = "";
        },
        openEditForm(course) {
            this.isEditing = true;
            this.form = { ...course };
            this.showForm = true;
            this.errorMessage = "";
            this.successMessage = "";
        },
        cancelForm() {
            this.showForm = false;
        },
        async saveCourse() {
            this.errorMessage = "";
            this.successMessage = "";
            try {
                if (this.isEditing) {
                    await window.API.put(`/api/admin/courses/${this.form.id}`, this.form);
                    this.successMessage = "Course updated successfully";
                } else {
                    await window.API.post("/api/admin/courses", this.form);
                    this.successMessage = "Course created successfully";
                }
                this.showForm = false;
                this.fetchCourses();
            } catch (err) {
                this.errorMessage = err.message || "Operation failed";
            }
        },
        async deleteCourse(id) {
            if (!confirm("Are you sure you want to delete this course?")) return;
            this.errorMessage = "";
            this.successMessage = "";
            try {
                await window.API.delete(`/api/admin/courses/${id}`);
                this.successMessage = "Course deleted successfully";
                this.fetchCourses();
            } catch (err) {
                this.errorMessage = err.message || "Failed to delete course";
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Course Management</h3>
                <p class="text-muted small">Create, update, and manage academic courses</p>
            </div>
            <button class="btn btn-primary" @click="openCreateForm" v-if="!showForm">
                + Add Course
            </button>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>

        <!-- Inline Form for Create / Edit -->
        <div class="card mb-4 border-primary" v-if="showForm">
            <div class="card-header bg-light fw-bold">
                {{ isEditing ? 'Edit Course: ' + form.code : 'Create New Course' }}
            </div>
            <div class="card-body">
                <form @submit.prevent="saveCourse">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label">Course Code <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" v-model="form.code" required :disabled="isEditing" placeholder="e.g. BSCS2001" />
                        </div>
                        <div class="col-md-5">
                            <label class="form-label">Course Name <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" v-model="form.name" required placeholder="e.g. Modern Application Development II" />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Status</label>
                            <select class="form-select" v-model="form.status">
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div class="col-12">
                            <label class="form-label">Description</label>
                            <textarea class="form-control" rows="2" v-model="form.description" placeholder="Brief course description"></textarea>
                        </div>
                    </div>
                    <div class="mt-3 text-end">
                        <button type="button" class="btn btn-secondary me-2" @click="cancelForm">Cancel</button>
                        <button type="submit" class="btn btn-success">{{ isEditing ? 'Update Course' : 'Save Course' }}</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Courses Table -->
        <div class="card">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading">
                            <td colspan="5" class="text-center py-4 text-muted">Loading courses...</td>
                        </tr>
                        <tr v-else-if="filteredCourses.length === 0">
                            <td colspan="5" class="text-center py-4 text-muted">No courses found</td>
                        </tr>
                        <tr v-for="c in filteredCourses" :key="c.id">
                            <td class="fw-bold">{{ c.code }}</td>
                            <td>{{ c.name }}</td>
                            <td class="text-muted small">{{ c.description || '-' }}</td>
                            <td>
                                <span class="badge" :class="c.status === 'Active' ? 'bg-success' : 'bg-secondary'">
                                    {{ c.status }}
                                </span>
                            </td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-primary me-2" @click="openEditForm(c)">Edit</button>
                                <button class="btn btn-sm btn-outline-danger" @click="deleteCourse(c.id)">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `
};

window.AdminCourses = AdminCourses;
