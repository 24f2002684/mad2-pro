// static/js/components/AdminExams.js
// Admin examination management component.
// Handles exam creation, timeline scheduling, lifecycle transitions, rubrics, and examiner assignments.

const AdminExams = {
    props: ["searchQuery"],
    data() {
        return {
            exams: [],
            courses: [],
            allExaminers: [],
            loading: false,
            errorMessage: "",
            successMessage: "",
            showForm: false,
            isEditing: false,
            activeTab: null, // "rubrics" or "examiners"
            selectedExam: null,
            rubrics: [],
            assignedExaminers: [],
            newExaminerId: "",
            rubricForm: { criterion_name: "", max_marks: 10, weightage: 0, description: "" },
            form: {
                id: null, course_id: "", name: "", exam_type: "Viva", duration: 30, max_marks: 100,
                instructions: "", slot_creation_start: "", slot_creation_end: "", booking_start: "", booking_end: ""
            }
        };
    },
    computed: {
        filteredExams() {
            if (!this.searchQuery) return this.exams;
            const q = this.searchQuery.toLowerCase();
            return this.exams.filter(e => e.name.toLowerCase().includes(q) || e.exam_type.toLowerCase().includes(q) || e.course_code.toLowerCase().includes(q));
        }
    },
    mounted() {
        this.fetchExams();
        this.fetchCourses();
        this.fetchExaminers();
    },
    methods: {
        async fetchExams() {
            this.loading = true;
            try {
                this.exams = await window.API.get("/api/admin/exams");
            } catch (err) {
                this.errorMessage = err.message || "Failed to load exams";
            } finally {
                this.loading = false;
            }
        },
        async fetchCourses() {
            try { this.courses = await window.API.get("/api/admin/courses"); } catch (e) {}
        },
        async fetchExaminers() {
            try { this.allExaminers = await window.API.get("/api/admin/examiners"); } catch (e) {}
        },
        openCreateForm() {
            this.isEditing = false;
            const today = new Date().toISOString().split("T")[0];
            this.form = {
                id: null, course_id: this.courses[0] ? this.courses[0].id : "", name: "", exam_type: "Viva",
                duration: 30, max_marks: 100, instructions: "", slot_creation_start: today, slot_creation_end: today,
                booking_start: today, booking_end: today
            };
            this.showForm = true;
            this.activeTab = null;
        },
        openEditForm(exam) {
            this.isEditing = true;
            this.form = { ...exam };
            this.showForm = true;
            this.activeTab = null;
        },
        async saveExam() {
            this.errorMessage = "";
            try {
                if (this.isEditing) {
                    await window.API.put(`/api/admin/exams/${this.form.id}`, this.form);
                    this.successMessage = "Exam updated successfully";
                } else {
                    await window.API.post("/api/admin/exams", this.form);
                    this.successMessage = "Exam created successfully";
                }
                this.showForm = false;
                this.fetchExams();
            } catch (err) {
                this.errorMessage = err.message || "Operation failed";
            }
        },
        async changeStatus(exam, newStatus) {
            this.errorMessage = "";
            try {
                await window.API.put(`/api/admin/exams/${exam.id}/status`, { status: newStatus });
                this.successMessage = `Exam status updated to ${newStatus}`;
                this.fetchExams();
            } catch (err) {
                this.errorMessage = err.message || "Failed to transition status";
            }
        },
        async openRubrics(exam) {
            this.selectedExam = exam;
            this.activeTab = "rubrics";
            this.showForm = false;
            try {
                this.rubrics = await window.API.get(`/api/admin/exams/${exam.id}/rubrics`);
            } catch (e) {}
        },
        async addRubric() {
            try {
                await window.API.post(`/api/admin/exams/${this.selectedExam.id}/rubrics`, this.rubricForm);
                this.rubricForm = { criterion_name: "", max_marks: 10, weightage: 0, description: "" };
                this.rubrics = await window.API.get(`/api/admin/exams/${this.selectedExam.id}/rubrics`);
            } catch (err) {
                this.errorMessage = err.message || "Failed to add rubric";
            }
        },
        async deleteRubric(rubricId) {
            try {
                await window.API.delete(`/api/admin/rubrics/${rubricId}`);
                this.rubrics = await window.API.get(`/api/admin/exams/${this.selectedExam.id}/rubrics`);
            } catch (err) {
                this.errorMessage = err.message || "Failed to delete rubric";
            }
        },
        async openExaminers(exam) {
            this.selectedExam = exam;
            this.activeTab = "examiners";
            this.showForm = false;
            try {
                this.assignedExaminers = await window.API.get(`/api/admin/exams/${exam.id}/examiners`);
            } catch (e) {}
        },
        async assignExaminer() {
            if (!this.newExaminerId) return;
            try {
                await window.API.post(`/api/admin/exams/${this.selectedExam.id}/examiners`, { examiner_id: this.newExaminerId });
                this.newExaminerId = "";
                this.assignedExaminers = await window.API.get(`/api/admin/exams/${this.selectedExam.id}/examiners`);
            } catch (err) {
                this.errorMessage = err.message || "Failed to assign examiner";
            }
        },
        async removeExaminer(examinerId) {
            try {
                await window.API.delete(`/api/admin/exams/${this.selectedExam.id}/examiners/${examinerId}`);
                this.assignedExaminers = await window.API.get(`/api/admin/exams/${this.selectedExam.id}/examiners`);
            } catch (err) {
                this.errorMessage = err.message || "Failed to remove examiner";
            }
        },
        async deleteExam(id) {
            if (!confirm("Are you sure you want to delete this examination?")) return;
            try {
                await window.API.delete(`/api/admin/exams/${id}`);
                this.successMessage = "Examination deleted successfully";
                this.fetchExams();
            } catch (err) {
                this.errorMessage = err.message || "Failed to delete examination";
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Examination Management</h3>
                <p class="text-muted small">Configure exam timelines, rubrics, and assigned faculty</p>
            </div>
            <button class="btn btn-primary" @click="openCreateForm" v-if="!showForm && !activeTab">+ Create Exam</button>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>

        <!-- Inline Exam Form -->
        <div class="card mb-4 border-primary" v-if="showForm">
            <div class="card-header bg-light fw-bold">{{ isEditing ? 'Edit Examination' : 'Create Examination' }}</div>
            <div class="card-body">
                <form @submit.prevent="saveExam">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label">Course <span class="text-danger">*</span></label>
                            <select class="form-select" v-model="form.course_id" required>
                                <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.code }} - {{ c.name }}</option>
                            </select>
                        </div>
                        <div class="col-md-5">
                            <label class="form-label">Examination Name <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" v-model="form.name" required placeholder="e.g. End Term Viva" />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Exam Type</label>
                            <select class="form-select" v-model="form.exam_type">
                                <option value="Viva">Viva</option>
                                <option value="Practical">Practical</option>
                                <option value="Project Demo">Project Demo</option>
                                <option value="Assessment">Assessment</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Duration (Minutes)</label>
                            <input type="number" class="form-control" v-model="form.duration" min="5" required />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Maximum Marks</label>
                            <input type="number" class="form-control" v-model="form.max_marks" min="1" required />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Slot Creation Start</label>
                            <input type="date" class="form-control" v-model="form.slot_creation_start" required />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Slot Creation End</label>
                            <input type="date" class="form-control" v-model="form.slot_creation_end" required />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Booking Start</label>
                            <input type="date" class="form-control" v-model="form.booking_start" required />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Booking End</label>
                            <input type="date" class="form-control" v-model="form.booking_end" required />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Instructions</label>
                            <input type="text" class="form-control" v-model="form.instructions" placeholder="Special student instructions" />
                        </div>
                    </div>
                    <div class="mt-3 text-end">
                        <button type="button" class="btn btn-secondary me-2" @click="showForm = false">Cancel</button>
                        <button type="submit" class="btn btn-success">{{ isEditing ? 'Update Exam' : 'Save Exam' }}</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Inline Rubrics Management -->
        <div class="card mb-4 border-info" v-if="activeTab === 'rubrics' && selectedExam">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <strong>Rubrics for: {{ selectedExam.name }}</strong>
                <button class="btn btn-sm btn-outline-secondary" @click="activeTab = null">Close</button>
            </div>
            <div class="card-body">
                <form @submit.prevent="addRubric" class="row g-2 mb-3 align-items-end">
                    <div class="col-md-4">
                        <input type="text" class="form-control form-control-sm" v-model="rubricForm.criterion_name" placeholder="Criterion Name" required />
                    </div>
                    <div class="col-md-2">
                        <input type="number" class="form-control form-control-sm" v-model="rubricForm.max_marks" placeholder="Max Marks" required min="1" />
                    </div>
                    <div class="col-md-2">
                        <input type="number" class="form-control form-control-sm" v-model="rubricForm.weightage" placeholder="Weightage %" />
                    </div>
                    <div class="col-md-3">
                        <input type="text" class="form-control form-control-sm" v-model="rubricForm.description" placeholder="Description" />
                    </div>
                    <div class="col-md-1">
                        <button type="submit" class="btn btn-sm btn-primary w-100">+ Add</button>
                    </div>
                </form>
                <ul class="list-group">
                    <li v-for="r in rubrics" :key="r.id" class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>{{ r.criterion_name }}</strong> (Max: {{ r.max_marks }} marks, Weight: {{ r.weightage }}%)
                            <div class="small text-muted">{{ r.description }}</div>
                        </div>
                        <button class="btn btn-sm btn-outline-danger" @click="deleteRubric(r.id)">Remove</button>
                    </li>
                    <li v-if="rubrics.length === 0" class="list-group-item text-muted text-center">No rubrics added yet</li>
                </ul>
            </div>
        </div>

        <!-- Inline Examiners Assignment -->
        <div class="card mb-4 border-success" v-if="activeTab === 'examiners' && selectedExam">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <strong>Assigned Examiners: {{ selectedExam.name }}</strong>
                <button class="btn btn-sm btn-outline-secondary" @click="activeTab = null">Close</button>
            </div>
            <div class="card-body">
                <div class="row g-2 mb-3">
                    <div class="col-md-8">
                        <select class="form-select form-select-sm" v-model="newExaminerId">
                            <option value="">Select Examiner to Assign...</option>
                            <option v-for="ex in allExaminers" :key="ex.id" :value="ex.id">{{ ex.full_name }} ({{ ex.department || ex.email }})</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <button class="btn btn-sm btn-success w-100" @click="assignExaminer" :disabled="!newExaminerId">+ Assign Examiner</button>
                    </div>
                </div>
                <ul class="list-group">
                    <li v-for="ex in assignedExaminers" :key="ex.id" class="list-group-item d-flex justify-content-between align-items-center">
                        <div><strong>{{ ex.full_name }}</strong> &bull; {{ ex.email }} ({{ ex.department }})</div>
                        <button class="btn btn-sm btn-outline-danger" @click="removeExaminer(ex.id)">Unassign</button>
                    </li>
                    <li v-if="assignedExaminers.length === 0" class="list-group-item text-muted text-center">No examiners assigned</li>
                </ul>
            </div>
        </div>

        <!-- Exams List -->
        <div class="card">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Exam Name</th>
                            <th>Course</th>
                            <th>Type / Duration</th>
                            <th>Timeline</th>
                            <th>Status</th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading"><td colspan="6" class="text-center py-4 text-muted">Loading exams...</td></tr>
                        <tr v-else-if="filteredExams.length === 0"><td colspan="6" class="text-center py-4 text-muted">No examinations found</td></tr>
                        <tr v-for="e in filteredExams" :key="e.id">
                            <td>
                                <strong>{{ e.name }}</strong>
                                <div class="small text-muted">Max Marks: {{ e.max_marks }}</div>
                            </td>
                            <td>{{ e.course_code }}</td>
                            <td><span class="badge bg-light text-dark">{{ e.exam_type }}</span> {{ e.duration }}m</td>
                            <td class="small">
                                <div><span class="text-muted">Slots:</span> {{ e.slot_creation_start }} to {{ e.slot_creation_end }}</div>
                                <div><span class="text-muted">Booking:</span> {{ e.booking_start }} to {{ e.booking_end }}</div>
                            </td>
                            <td>
                                <span class="badge" :class="{
                                    'bg-secondary': e.status === 'Draft',
                                    'bg-warning text-dark': e.status === 'Slot Creation',
                                    'bg-primary': e.status === 'Booking Open',
                                    'bg-danger': e.status === 'Closed',
                                    'bg-success': e.status === 'Completed'
                                }">{{ e.status }}</span>
                            </td>
                            <td class="text-end">
                                <!-- Status Transition Controls -->
                                <div class="btn-group btn-group-sm me-2" v-if="e.status === 'Draft'">
                                    <button class="btn btn-warning" @click="changeStatus(e, 'Slot Creation')">Open Slot Creation</button>
                                </div>
                                <div class="btn-group btn-group-sm me-2" v-else-if="e.status === 'Slot Creation'">
                                    <button class="btn btn-outline-secondary" @click="changeStatus(e, 'Draft')">Close Slots</button>
                                    <button class="btn btn-primary" @click="changeStatus(e, 'Booking Open')">Open Booking</button>
                                </div>
                                <div class="btn-group btn-group-sm me-2" v-else-if="e.status === 'Booking Open'">
                                    <button class="btn btn-danger" @click="changeStatus(e, 'Closed')">Close Booking</button>
                                </div>
                                <div class="btn-group btn-group-sm me-2" v-else-if="e.status === 'Closed'">
                                    <button class="btn btn-outline-primary" @click="changeStatus(e, 'Booking Open')">Re-Open</button>
                                    <button class="btn btn-success" @click="changeStatus(e, 'Completed')">Complete</button>
                                </div>

                                <button class="btn btn-sm btn-outline-info me-1" @click="openRubrics(e)">Rubrics</button>
                                <button class="btn btn-sm btn-outline-success me-1" @click="openExaminers(e)">Examiners</button>
                                <button class="btn btn-sm btn-outline-primary me-1" @click="openEditForm(e)">Edit</button>
                                <button class="btn btn-sm btn-outline-danger" @click="deleteExam(e.id)">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `
};

window.AdminExams = AdminExams;
