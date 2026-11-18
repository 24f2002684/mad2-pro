// static/js/components/ExaminerExams.js
// Examiner assigned examinations view component.

const ExaminerExams = {
    props: ["searchQuery"],
    data() {
        return {
            exams: [],
            loading: false,
            errorMessage: ""
        };
    },
    computed: {
        filteredExams() {
            if (!this.searchQuery) return this.exams;
            const q = this.searchQuery.toLowerCase();
            return this.exams.filter(e => 
                e.name.toLowerCase().includes(q) || 
                (e.course_code && e.course_code.toLowerCase().includes(q)) ||
                e.exam_type.toLowerCase().includes(q)
            );
        }
    },
    watch: {
        searchQuery(newVal) {
            this.fetchExams(newVal);
        }
    },
    mounted() {
        this.fetchExams();
    },
    methods: {
        async fetchExams(query = "") {
            this.loading = true;
            try {
                const url = query ? `/api/examiner/exams?q=${encodeURIComponent(query)}` : "/api/examiner/exams";
                this.exams = await window.API.get(url);
            } catch (err) {
                this.errorMessage = err.message || "Failed to load assigned exams";
            } finally {
                this.loading = false;
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Assigned Examinations</h3>
                <p class="text-muted small">Exams you are authorized to configure slots and conduct evaluations for</p>
            </div>
            <router-link to="/examiner/slots" class="btn btn-primary">+ Manage Slots</router-link>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>

        <div class="card">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Examination</th>
                            <th>Course</th>
                            <th>Type & Duration</th>
                            <th>Slot Creation Window</th>
                            <th>Status</th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading"><td colspan="6" class="text-center py-4 text-muted">Loading assigned exams...</td></tr>
                        <tr v-else-if="filteredExams.length === 0"><td colspan="6" class="text-center py-4 text-muted">No examinations assigned to your account</td></tr>
                        <tr v-for="e in filteredExams" :key="e.id">
                            <td>
                                <div class="fw-bold">{{ e.name }}</div>
                                <div class="small text-muted">Max Marks: {{ e.max_marks }}</div>
                            </td>
                            <td>{{ e.course_code }}</td>
                            <td>{{ e.exam_type }} ({{ e.duration }}m)</td>
                            <td class="small">
                                <div>{{ e.slot_creation_start }} to {{ e.slot_creation_end }}</div>
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
                                <router-link :to="'/examiner/slots?exam_id=' + e.id" class="btn btn-sm btn-outline-primary">
                                    View / Add Slots
                                </router-link>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `
};

window.ExaminerExams = ExaminerExams;
