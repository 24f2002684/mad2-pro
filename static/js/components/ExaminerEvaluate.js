// static/js/components/ExaminerEvaluate.js
// Examiner candidate evaluation interface using standardized rubrics.

const ExaminerEvaluate = {
    data() {
        return {
            bookingId: this.$route.params.bookingId,
            booking: null,
            rubrics: [],
            examMaxMarks: 0,
            resultsPublished: false,
            scoresMap: {},
            remarks: "",
            loading: false,
            saving: false,
            errorMessage: "",
            successMessage: ""
        };
    },
    computed: {
        totalMarks() {
            let sum = 0;
            for (const r of this.rubrics) {
                const val = parseFloat(this.scoresMap[r.id]);
                if (!isNaN(val)) sum += val;
            }
            return sum;
        }
    },
    mounted() {
        this.fetchEvaluationData();
    },
    methods: {
        async fetchEvaluationData() {
            this.loading = true;
            try {
                const data = await window.API.get(`/api/examiner/bookings/${this.bookingId}/evaluation`);
                this.booking = data.booking;
                this.rubrics = data.rubrics;
                this.examMaxMarks = data.exam_max_marks;
                this.resultsPublished = data.results_published;

                // Pre-populate if evaluation exists
                const map = {};
                if (data.evaluation && data.evaluation.scores) {
                    this.remarks = data.evaluation.remarks;
                    for (const s of data.evaluation.scores) {
                        map[s.rubric_id] = s.marks;
                    }
                } else {
                    for (const r of this.rubrics) {
                        map[r.id] = 0;
                    }
                }
                this.scoresMap = map;
            } catch (err) {
                this.errorMessage = err.message || "Failed to load candidate evaluation data";
            } finally {
                this.loading = false;
            }
        },
        async submitEvaluation() {
            this.errorMessage = "";
            this.successMessage = "";

            if (!this.remarks.trim()) {
                this.errorMessage = "Examiner remarks are mandatory";
                return;
            }

            const scoresPayload = [];
            for (const r of this.rubrics) {
                const marks = parseFloat(this.scoresMap[r.id]);
                if (isNaN(marks) || marks < 0 || marks > r.max_marks) {
                    this.errorMessage = `Marks for '${r.criterion_name}' must be between 0 and ${r.max_marks}`;
                    return;
                }
                scoresPayload.push({ rubric_id: r.id, marks });
            }

            this.saving = true;
            try {
                const res = await window.API.post(`/api/examiner/bookings/${this.bookingId}/evaluation`, {
                    remarks: this.remarks,
                    scores: scoresPayload
                });
                this.successMessage = res.message || "Evaluation successfully saved!";
                setTimeout(() => {
                    this.$router.push("/examiner/slots");
                }, 1200);
            } catch (err) {
                this.errorMessage = err.message || "Failed to save evaluation";
            } finally {
                this.saving = false;
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Candidate Assessment</h3>
                <p class="text-muted small">Score evaluation criteria and submit candidate feedback</p>
            </div>
            <router-link to="/examiner/slots" class="btn btn-outline-secondary btn-sm">&larr; Back to Slots</router-link>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>

        <div v-if="resultsPublished" class="alert alert-info py-2 small">
            <i class="bi bi-lock-fill me-1"></i> Results for this examination have been published. Evaluations are now locked and read-only.
        </div>

        <div v-if="loading" class="text-center py-5 text-muted">Loading evaluation sheet...</div>

        <div class="row g-4" v-else-if="booking">
            <!-- Candidate Details -->
            <div class="col-md-4">
                <div class="card shadow-sm h-100">
                    <div class="card-header bg-light fw-bold">Candidate Information</div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="text-muted small">Student Name</label>
                            <div class="fw-bold fs-5">{{ booking.student_name }}</div>
                            <div class="small text-muted">{{ booking.student_email }}</div>
                        </div>
                        <div class="mb-3">
                            <label class="text-muted small">Examination</label>
                            <div class="fw-bold">{{ booking.exam_name }}</div>
                        </div>
                        <div class="mb-3">
                            <label class="text-muted small">Appointment Time</label>
                            <div>{{ booking.slot_date }} &bull; {{ booking.slot_start }}-{{ booking.slot_end }}</div>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-muted">Total Marks:</span>
                            <span class="fs-4 fw-bold text-primary">{{ totalMarks }} / {{ examMaxMarks }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rubric Assessment Form -->
            <div class="col-md-8">
                <div class="card shadow-sm">
                    <div class="card-header bg-light fw-bold">Rubric Scoring Sheet</div>
                    <div class="card-body">
                        <form @submit.prevent="submitEvaluation">
                            <div v-if="rubrics.length === 0" class="text-center py-4 text-muted">
                                No rubrics have been defined for this examination.
                            </div>

                            <div v-for="r in rubrics" :key="r.id" class="p-3 mb-3 border rounded bg-light">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <strong>{{ r.criterion_name }}</strong>
                                    <span class="badge bg-secondary">Max: {{ r.max_marks }} pts ({{ r.weightage }}%)</span>
                                </div>
                                <div class="small text-muted mb-2" v-if="r.description">{{ r.description }}</div>
                                <div class="row align-items-center">
                                    <div class="col-sm-4">
                                        <label class="form-label small mb-0">Awarded Marks:</label>
                                    </div>
                                    <div class="col-sm-8">
                                        <input
                                            type="number"
                                            step="0.5"
                                            class="form-control"
                                            v-model="scoresMap[r.id]"
                                            :max="r.max_marks"
                                            min="0"
                                            required
                                            :disabled="resultsPublished"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label fw-bold">Examiner Remarks & Feedback <span class="text-danger">*</span></label>
                                <textarea
                                    class="form-control"
                                    rows="3"
                                    v-model="remarks"
                                    placeholder="Constructive feedback, technical depth observed, and performance notes..."
                                    required
                                    :disabled="resultsPublished"
                                ></textarea>
                            </div>

                            <div class="text-end" v-if="!resultsPublished">
                                <button type="submit" class="btn btn-success" :disabled="saving">
                                    <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                                    Submit Evaluation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
};

window.ExaminerEvaluate = ExaminerEvaluate;
