// static/js/components/StudentExams.js
// Student examination search, filtering, and slot booking interface.

const StudentExams = {
    props: ["searchQuery"],
    data() {
        return {
            exams: [],
            courses: [],
            selectedCourseId: "",
            selectedType: "",
            selectedStatus: "",
            activeExamSlots: null,
            examSlots: [],
            loading: false,
            loadingSlots: false,
            errorMessage: "",
            successMessage: ""
        };
    },
    computed: {
        filteredExams() {
            let list = this.exams;
            if (this.selectedCourseId) {
                list = list.filter(e => e.course_id === parseInt(this.selectedCourseId));
            }
            if (this.selectedType) {
                list = list.filter(e => e.exam_type === this.selectedType);
            }
            if (this.selectedStatus) {
                list = list.filter(e => e.status === this.selectedStatus);
            }
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                list = list.filter(e => e.name.toLowerCase().includes(q) || (e.course_code && e.course_code.toLowerCase().includes(q)));
            }
            return list;
        }
    },
    watch: {
        searchQuery() {
            this.fetchExams();
        }
    },
    mounted() {
        this.fetchCourses();
        this.fetchExams();
    },
    methods: {
        async fetchCourses() {
            try {
                this.courses = await window.API.get("/api/admin/courses");
            } catch (err) {}
        },
        async fetchExams() {
            this.loading = true;
            try {
                let url = "/api/student/exams";
                const params = [];
                if (this.searchQuery) params.push(`q=${encodeURIComponent(this.searchQuery)}`);
                if (this.selectedCourseId) params.push(`course_id=${this.selectedCourseId}`);
                if (this.selectedType) params.push(`exam_type=${this.selectedType}`);
                if (this.selectedStatus) params.push(`status=${this.selectedStatus}`);
                if (params.length) url += "?" + params.join("&");

                this.exams = await window.API.get(url);
            } catch (err) {
                this.errorMessage = err.message || "Failed to load examinations";
            } finally {
                this.loading = false;
            }
        },
        async toggleSlots(exam) {
            if (this.activeExamSlots && this.activeExamSlots.id === exam.id) {
                this.activeExamSlots = null;
                return;
            }
            this.activeExamSlots = exam;
            this.loadingSlots = true;
            this.errorMessage = "";
            this.successMessage = "";
            try {
                this.examSlots = await window.API.get(`/api/student/exams/${exam.id}/slots`);
            } catch (err) {
                this.errorMessage = err.message || "Failed to load examination slots";
            } finally {
                this.loadingSlots = false;
            }
        },
        async bookSlot(slot) {
            this.errorMessage = "";
            this.successMessage = "";
            try {
                const res = await window.API.post("/api/student/bookings", { slot_id: slot.id });
                this.successMessage = res.message || "Slot booked successfully!";
                this.activeExamSlots = null;
                this.fetchExams();
            } catch (err) {
                this.errorMessage = err.message || "Slot booking failed";
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Browse Examinations</h3>
                <p class="text-muted small">Select an open examination and reserve your appointment slot</p>
            </div>
            <router-link to="/student/history" class="btn btn-outline-primary btn-sm">My Bookings</router-link>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>

        <!-- Filter Controls -->
        <div class="card mb-4 p-3 bg-light border-0">
            <div class="row g-2">
                <div class="col-md-4">
                    <select class="form-select form-select-sm" v-model="selectedCourseId" @change="fetchExams">
                        <option value="">All Courses</option>
                        <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.code }} - {{ c.name }}</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <select class="form-select form-select-sm" v-model="selectedType" @change="fetchExams">
                        <option value="">All Exam Types</option>
                        <option value="Viva">Viva</option>
                        <option value="Practical">Practical</option>
                        <option value="Project Demo">Project Demo</option>
                        <option value="Assessment">Assessment</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <select class="form-select form-select-sm" v-model="selectedStatus" @change="fetchExams">
                        <option value="">All Statuses</option>
                        <option value="Booking Open">Booking Open</option>
                        <option value="Closed">Closed</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Inline Slots Selector -->
        <div class="card mb-4 border-primary shadow-sm" v-if="activeExamSlots">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <span>Available Slots for: <strong>{{ activeExamSlots.name }}</strong> ({{ activeExamSlots.course_code }})</span>
                <button class="btn btn-sm btn-outline-light" @click="activeExamSlots = null">Close</button>
            </div>
            <div class="card-body">
                <div v-if="activeExamSlots.has_active_booking" class="alert alert-warning py-2 small">
                    <i class="bi bi-info-circle me-1"></i> You already hold an active booking for this examination. Re-booking requires cancelling your current reservation first.
                </div>

                <div v-if="loadingSlots" class="text-center py-4 text-muted">Loading available slots...</div>
                <div v-else-if="examSlots.length === 0" class="text-center py-4 text-muted">No slots currently scheduled for this examination</div>
                <div class="table-responsive" v-else>
                    <table class="table table-hover align-middle mb-0">
                        <thead class="table-light">
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Examiner</th>
                                <th>Available Seats</th>
                                <th>Status</th>
                                <th class="text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="s in examSlots" :key="s.id">
                                <td class="fw-bold">{{ s.date }}</td>
                                <td>{{ s.start_time }} - {{ s.end_time }}</td>
                                <td>{{ s.examiner_name }}</td>
                                <td>
                                    <span class="badge" :class="s.available_seats > 0 ? 'bg-success' : 'bg-secondary'">
                                        {{ s.available_seats }} of {{ s.capacity }} left
                                    </span>
                                </td>
                                <td>
                                    <span class="badge" :class="s.status === 'Available' ? 'bg-success' : 'bg-danger'">
                                        {{ s.status }}
                                    </span>
                                </td>
                                <td class="text-end">
                                    <button 
                                        class="btn btn-sm btn-primary" 
                                        @click="bookSlot(s)" 
                                        :disabled="s.status !== 'Available' || s.available_seats <= 0 || activeExamSlots.has_active_booking"
                                    >
                                        {{ activeExamSlots.has_active_booking ? 'Booked' : (s.available_seats > 0 ? 'Book Slot' : 'Full') }}
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Examinations Table -->
        <div class="card">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Examination</th>
                            <th>Course</th>
                            <th>Type & Duration</th>
                            <th>Booking Deadline</th>
                            <th>Available Seats</th>
                            <th>Status</th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading"><td colspan="7" class="text-center py-4 text-muted">Loading examinations...</td></tr>
                        <tr v-else-if="filteredExams.length === 0"><td colspan="7" class="text-center py-4 text-muted">No examinations available</td></tr>
                        <tr v-for="e in filteredExams" :key="e.id">
                            <td>
                                <div class="fw-bold">{{ e.name }}</div>
                                <div class="small text-muted" v-if="e.instructions">{{ e.instructions }}</div>
                            </td>
                            <td>{{ e.course_code }}</td>
                            <td>{{ e.exam_type }} ({{ e.duration }}m)</td>
                            <td class="small">{{ e.booking_end }}</td>
                            <td>
                                <span class="badge bg-light text-dark border">{{ e.available_slots }} slots open</span>
                            </td>
                            <td>
                                <span class="badge" :class="{
                                    'bg-primary': e.status === 'Booking Open',
                                    'bg-danger': e.status === 'Closed',
                                    'bg-success': e.status === 'Completed'
                                }">{{ e.status }}</span>
                                <div v-if="e.has_active_booking" class="badge bg-info text-dark mt-1 d-block">Booked</div>
                            </td>
                            <td class="text-end">
                                <button 
                                    class="btn btn-sm" 
                                    :class="activeExamSlots && activeExamSlots.id === e.id ? 'btn-secondary' : 'btn-outline-primary'" 
                                    @click="toggleSlots(e)"
                                    :disabled="e.status !== 'Booking Open'"
                                >
                                    {{ activeExamSlots && activeExamSlots.id === e.id ? 'Hide Slots' : 'View Slots & Book' }}
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

window.StudentExams = StudentExams;
