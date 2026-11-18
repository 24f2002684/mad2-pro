// static/js/components/ExaminerSlots.js
// Examiner slot creation, management, and booked candidate roster component.

const ExaminerSlots = {
    props: ["searchQuery"],
    data() {
        return {
            slots: [],
            assignedExams: [],
            selectedExamId: "",
            loading: false,
            errorMessage: "",
            successMessage: "",
            showForm: false,
            isEditing: false,
            activeSlotBookings: null,
            bookedStudents: [],
            form: {
                id: null,
                exam_id: "",
                date: "",
                start_time: "10:00",
                end_time: "10:30",
                capacity: 1,
                meeting_link: ""
            }
        };
    },
    computed: {
        filteredSlots() {
            let list = this.slots;
            if (this.selectedExamId) {
                list = list.filter(s => s.exam_id === parseInt(this.selectedExamId));
            }
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                list = list.filter(s => s.exam_name.toLowerCase().includes(q) || s.date.includes(q));
            }
            return list;
        },
        openSlotCreationExams() {
            // Exams in 'Slot Creation' phase
            return this.assignedExams.filter(e => e.status === "Slot Creation");
        }
    },
    watch: {
        "$route.query.exam_id"(newVal) {
            if (newVal) this.selectedExamId = newVal;
        }
    },
    mounted() {
        if (this.$route.query.exam_id) {
            this.selectedExamId = this.$route.query.exam_id;
        }
        this.fetchAssignedExams();
        this.fetchSlots();
    },
    methods: {
        async fetchAssignedExams() {
            try {
                this.assignedExams = await window.API.get("/api/examiner/exams");
            } catch (err) {}
        },
        async fetchSlots() {
            this.loading = true;
            try {
                this.slots = await window.API.get("/api/examiner/slots");
            } catch (err) {
                this.errorMessage = err.message || "Failed to load slots";
            } finally {
                this.loading = false;
            }
        },
        openCreateForm() {
            this.isEditing = false;
            const today = new Date().toISOString().split("T")[0];
            const firstOpen = this.openSlotCreationExams[0];
            this.form = {
                id: null,
                exam_id: firstOpen ? firstOpen.id : "",
                date: today,
                start_time: "10:00",
                end_time: "10:30",
                capacity: 1,
                meeting_link: ""
            };
            this.showForm = true;
            this.activeSlotBookings = null;
        },
        openEditForm(slot) {
            this.isEditing = true;
            this.form = { ...slot };
            this.showForm = true;
            this.activeSlotBookings = null;
        },
        async saveSlot() {
            this.errorMessage = "";
            this.successMessage = "";
            if (this.form.end_time <= this.form.start_time) {
                this.errorMessage = "End time must be later than start time";
                return;
            }
            try {
                if (this.isEditing) {
                    await window.API.put(`/api/examiner/slots/${this.form.id}`, this.form);
                    this.successMessage = "Slot updated successfully";
                } else {
                    await window.API.post("/api/examiner/slots", this.form);
                    this.successMessage = "Slot created successfully";
                }
                this.showForm = false;
                this.fetchSlots();
            } catch (err) {
                this.errorMessage = err.message || "Failed to save slot";
            }
        },
        async deleteSlot(slotId) {
            if (!confirm("Are you sure you want to delete this slot?")) return;
            try {
                await window.API.delete(`/api/examiner/slots/${slotId}`);
                this.successMessage = "Slot deleted successfully";
                this.fetchSlots();
            } catch (err) {
                this.errorMessage = err.message || "Failed to delete slot";
            }
        },
        async viewBookings(slot) {
            this.activeSlotBookings = slot;
            this.showForm = false;
            try {
                this.bookedStudents = await window.API.get(`/api/examiner/slots/${slot.id}/bookings`);
            } catch (err) {
                this.errorMessage = err.message || "Failed to load booked students";
            }
        },
        async completeSlot(slot) {
            if (!confirm(`Mark slot #${slot.id} as Completed? This requires all candidates to be evaluated.`)) return;
            this.errorMessage = "";
            this.successMessage = "";
            try {
                const res = await window.API.put(`/api/examiner/slots/${slot.id}/complete`);
                this.successMessage = res.message || "Slot marked as Completed";
                this.fetchSlots();
            } catch (err) {
                this.errorMessage = err.message || "Failed to complete slot";
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Examination Slots</h3>
                <p class="text-muted small">Configure student appointment slots and view booked candidates</p>
            </div>
            <button class="btn btn-primary" @click="openCreateForm" v-if="!showForm" :disabled="openSlotCreationExams.length === 0">
                + Create New Slot
            </button>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>

        <!-- Filter bar -->
        <div class="card mb-3 p-3 bg-light border-0">
            <div class="row g-2 align-items-center">
                <div class="col-md-6">
                    <select class="form-select form-select-sm" v-model="selectedExamId">
                        <option value="">All Assigned Examinations</option>
                        <option v-for="e in assignedExams" :key="e.id" :value="e.id">{{ e.name }} (Status: {{ e.status }})</option>
                    </select>
                </div>
                <div class="col-md-6 text-md-end small text-muted">
                    Exams open for slot creation: <strong>{{ openSlotCreationExams.length }}</strong>
                </div>
            </div>
        </div>

        <!-- Inline Create/Edit Form -->
        <div class="card mb-4 border-primary" v-if="showForm">
            <div class="card-header bg-light fw-bold">{{ isEditing ? 'Edit Examination Slot' : 'Create Examination Slot' }}</div>
            <div class="card-body">
                <form @submit.prevent="saveSlot">
                    <div class="row g-3">
                        <div class="col-md-6" v-if="!isEditing">
                            <label class="form-label">Examination <span class="text-danger">*</span></label>
                            <select class="form-select" v-model="form.exam_id" required>
                                <option v-for="e in openSlotCreationExams" :key="e.id" :value="e.id">{{ e.name }}</option>
                            </select>
                        </div>
                        <div class="col-md-6" v-else>
                            <label class="form-label">Examination</label>
                            <input type="text" class="form-control" :value="form.exam_name" disabled />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Date <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" v-model="form.date" required />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Start Time <span class="text-danger">*</span></label>
                            <input type="time" class="form-control" v-model="form.start_time" required />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">End Time <span class="text-danger">*</span></label>
                            <input type="time" class="form-control" v-model="form.end_time" required />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Student Capacity</label>
                            <input type="number" class="form-control" v-model="form.capacity" min="1" required />
                        </div>
                        <div class="col-md-9">
                            <label class="form-label">Online Meeting Link (Optional)</label>
                            <input type="url" class="form-control" v-model="form.meeting_link" placeholder="https://meet.google.com/..." />
                        </div>
                    </div>
                    <div class="mt-3 text-end">
                        <button type="button" class="btn btn-secondary me-2" @click="showForm = false">Cancel</button>
                        <button type="submit" class="btn btn-success">{{ isEditing ? 'Update Slot' : 'Save Slot' }}</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Booked Students Inline View -->
        <div class="card mb-4 border-info" v-if="activeSlotBookings">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <strong>Booked Candidates for Slot #{{ activeSlotBookings.id }} ({{ activeSlotBookings.date }} {{ activeSlotBookings.start_time }}-{{ activeSlotBookings.end_time }})</strong>
                <button class="btn btn-sm btn-outline-secondary" @click="activeSlotBookings = null">Close</button>
            </div>
            <div class="card-body p-0">
                <table class="table table-sm align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>Student Name</th>
                            <th>Email</th>
                            <th>Booked At</th>
                            <th>Status</th>
                            <th>Evaluation</th>
                            <th class="text-end">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="bookedStudents.length === 0"><td colspan="6" class="text-center py-3 text-muted">No students booked in this slot yet</td></tr>
                        <tr v-for="b in bookedStudents" :key="b.id">
                            <td class="fw-bold">{{ b.student_name }}</td>
                            <td>{{ b.student_email }}</td>
                            <td>{{ b.booked_at ? b.booked_at.split('T')[0] : '-' }}</td>
                            <td><span class="badge bg-primary">{{ b.status }}</span></td>
                            <td>
                                <span class="badge" :class="b.evaluated ? 'bg-success' : 'bg-warning text-dark'">
                                    {{ b.evaluated ? ('Evaluated (' + b.evaluation_marks + ' pts)') : 'Pending' }}
                                </span>
                            </td>
                            <td class="text-end">
                                <router-link :to="'/examiner/evaluate/' + b.id" class="btn btn-sm btn-primary">
                                    {{ b.evaluated ? 'Re-Evaluate' : 'Evaluate' }}
                                </router-link>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Slots Table -->
        <div class="card">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Examination</th>
                            <th>Date</th>
                            <th>Time Window</th>
                            <th>Capacity</th>
                            <th>Available</th>
                            <th>Bookings</th>
                            <th>Status</th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading"><td colspan="8" class="text-center py-4 text-muted">Loading slots...</td></tr>
                        <tr v-else-if="filteredSlots.length === 0"><td colspan="8" class="text-center py-4 text-muted">No slots match your criteria</td></tr>
                        <tr v-for="s in filteredSlots" :key="s.id">
                            <td class="fw-bold">{{ s.exam_name }}</td>
                            <td>{{ s.date }}</td>
                            <td>{{ s.start_time }} - {{ s.end_time }}</td>
                            <td>{{ s.capacity }}</td>
                            <td><span class="badge bg-info text-dark">{{ s.available_seats }}</span></td>
                            <td>
                                <span class="badge bg-light text-dark border">{{ s.bookings_count || 0 }} booked</span>
                            </td>
                            <td>
                                <span class="badge" :class="{
                                    'bg-success': s.status === 'Available',
                                    'bg-danger': s.status === 'Full',
                                    'bg-secondary': s.status === 'Cancelled',
                                    'bg-info': s.status === 'Completed'
                                }">{{ s.status }}</span>
                            </td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-info me-1" @click="viewBookings(s)">Candidates</button>
                                <button class="btn btn-sm btn-outline-success me-1" @click="completeSlot(s)" v-if="s.status !== 'Completed' && s.bookings_count > 0">Complete</button>
                                <button class="btn btn-sm btn-outline-primary me-1" @click="openEditForm(s)" :disabled="s.bookings_count > 0">Edit</button>
                                <button class="btn btn-sm btn-outline-danger" @click="deleteSlot(s.id)" :disabled="s.bookings_count > 0">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `
};

window.ExaminerSlots = ExaminerSlots;
