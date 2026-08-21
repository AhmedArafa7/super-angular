import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, ArrowRight, Activity, Cpu, Wrench, Play, Shield, Award, Users, RefreshCw, Volume2, VolumeX, Sparkles, CheckCircle2, AlertTriangle, Code2, Plus, Zap, Heart, Database, Lock, Radio } from 'lucide-angular';

export interface PatientCase {
  id: string;
  name: string;
  age: number;
  profession: string;
  avatar: string;
  injury: string;
  bodyPart: 'ankle' | 'knee' | 'spine' | 'shoulder' | 'cortex';
  bodyPartLabel: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  description: string;
  targetROM: number; // Range of Motion in degrees
  painThreshold: number; // Maximum safe pain %
  requiredFrequency: number; // Synaptic frequency Hz
  defaultCode: string;
  solutionCode: string;
  rewardEGP: number;
  rewardXP: number;
  rewardCodex: number;
  status: 'unscanned' | 'diagnosed' | 'coded' | 'treating' | 'cured';
  currentROM: number;
  currentPain: number;
  synapseIntegrity: number; // 0-100%
  emgSignalQuality: number; // 0-100%
}

export interface BionicPart {
  id: string;
  name: string;
  type: 'actuator' | 'chassis' | 'sensor' | 'chip';
  typeLabel: string;
  level: number;
  maxLevel: number;
  icon: string;
  costEGP: number;
  precisionBonus: number;
  speedBonus: number;
  comfortBonus: number;
  description: string;
}

export interface ResearchNode {
  id: string;
  title: string;
  branch: 'robotics' | 'neural' | 'materials';
  costCodex: number;
  unlocked: boolean;
  icon: string;
  effect: string;
  reqNodeId?: string;
}

export interface ClinicRoom {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  icon: string;
  costEGP: number;
  bonus: string;
  description: string;
}

@Component({
  selector: 'app-neuro-physio',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './neuro-physio.component.html',
  styleUrls: ['./neuro-physio.component.css']
})
export class NeuroPhysioComponent implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);

  // Lucide Icons
  readonly ArrowRight = ArrowRight;
  readonly Activity = Activity;
  readonly Cpu = Cpu;
  readonly Wrench = Wrench;
  readonly Play = Play;
  readonly Shield = Shield;
  readonly Award = Award;
  readonly Users = Users;
  readonly RefreshCw = RefreshCw;
  readonly Volume2 = Volume2;
  readonly VolumeX = VolumeX;
  readonly Sparkles = Sparkles;
  readonly CheckCircle2 = CheckCircle2;
  readonly AlertTriangle = AlertTriangle;
  readonly Code2 = Code2;
  readonly Plus = Plus;
  readonly Zap = Zap;
  readonly Heart = Heart;
  readonly Database = Database;
  readonly Lock = Lock;
  readonly Radio = Radio;
  readonly Math = Math;

  @ViewChild('clinicCanvas', { static: false }) clinicCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('emgCanvas', { static: false }) emgCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('treatmentCanvas', { static: false }) treatmentCanvasRef!: ElementRef<HTMLCanvasElement>;

  // Game Lifecycle & Modes
  gameState: 'MENU' | 'PLAYING' | 'ROOM_LOBBY' | 'PRO_MODAL' = 'MENU';
  gameMode: 'local' | 'p2p' | 'pro' = 'local';
  activeTab: 'cases' | 'diagnosis' | 'ide' | 'workshop' | 'treatment' | 'management' | 'research' = 'cases';

  // Room / Multiplayer
  roomCode: string = '';
  inputRoomCode: string = '';
  isHost: boolean = false;
  connectedPlayers: string[] = ['د. عبد الله (المضيف)'];
  isProUser: boolean = false;

  // Clinic Economics & Stats
  cairoCredits = 3500; // EGP
  clinicXP = 120;
  clinicLevel = 1;
  reputationStars = 4.8;
  codexFragments = 45;
  curedPatientsCount = 0;
  timeOfDay: 'morning' | 'sunset' | 'night' = 'sunset';

  // Active Patient Roster
  patients: PatientCase[] = [
    {
      id: 'p1',
      name: 'طارق محمد (كابتن كرة قدم)',
      age: 26,
      profession: 'لاعب وسط نادي المقاولون العرب',
      avatar: '⚽',
      injury: 'التواء حاد في أربطة الكاحل مع انضغاط العصب الشظوي',
      bodyPart: 'ankle',
      bodyPartLabel: 'مفصل الكاحل الأيمن',
      severity: 'moderate',
      description: 'أصيب أثناء تدريب بالاستاد. يعاني من هبوط في حركة مشط القدم وفقدان إشارات التحسس العصبي (EMG Weakness).',
      targetROM: 45,
      painThreshold: 65,
      requiredFrequency: 14,
      defaultCode: `// Rehab-Logic v1.3 - Ankle Mobilization\nPatient: S. Mohamed (Ankle Strain)\n\n<Neural_Link_Protocol>\n  {CHECK_NEURAL_SENSORY_INPUT}\n  if (INPUT > THRESHOLD_PAIN) {\n    STOP_MOVEMENT;\n    ALERT;\n  }\n</Neural_Link_Protocol>\n\n<Joint_Path>\n  {CALCULATE_OPTIMAL_STRETCH_PATH}\n  {APPLY_FORCE_GENTLY}\n  Target: ANKLE_JOINT_A1\n  {ROTATE: +15_DEG}\n  {HOLD: 5_SECONDS}\n  {NEURAL_HEAL: BIOCURRENT_LOW}\n</Joint_Path>`,
      solutionCode: `// Rehab-Logic v1.3 - Ankle Mobilization\nPatient: S. Mohamed (Ankle Strain)\n\n<Neural_Link_Protocol>\n  {CHECK_NEURAL_SENSORY_INPUT}\n  if (INPUT > THRESHOLD_PAIN) {\n    STOP_MOVEMENT;\n    ALERT;\n  }\n</Neural_Link_Protocol>\n\n<Joint_Path>\n  {CALCULATE_OPTIMAL_STRETCH_PATH}\n  {APPLY_FORCE_GENTLY}\n  Target: ANKLE_JOINT_A1\n  {ROTATE: +15_DEG}\n  {HOLD: 5_SECONDS}\n  {NEURAL_HEAL: BIOCURRENT_LOW}\n</Joint_Path>`,
      rewardEGP: 850,
      rewardXP: 150,
      rewardCodex: 20,
      status: 'unscanned',
      currentROM: 12,
      currentPain: 40,
      synapseIntegrity: 35,
      emgSignalQuality: 42
    },
    {
      id: 'p2',
      name: 'فاطمة الزهراء (مهندسة برمجيات)',
      age: 34,
      profession: 'مطورة أنظمة ذكاء اصطناعي بالمعادي',
      avatar: '💻',
      injury: 'تشنج عصبي بمفصل الركبة بعد جلطة دماغية خفيفة',
      bodyPart: 'knee',
      bodyPartLabel: 'مفصل الركبة الأيسر',
      severity: 'severe',
      description: 'فقدت التحكم التناسقي في عضلات الفخذ الرباعية. تحتاج لإعادة تخليق المسار العصبي عبر ترددات بيتا.',
      targetROM: 110,
      painThreshold: 55,
      requiredFrequency: 22,
      defaultCode: `// Rehab-Logic v1.3 - Knee Flexion Protocol\nPatient: Fatima Al-Zahraa (Spastic Knee)\n\n<Neural_Link_Protocol>\n  {SYNC_BRAINWAVE_BETA: 22_HZ}\n  {INHIBIT_SPASM_REFLEX}\n</Neural_Link_Protocol>\n\n<Joint_Path>\n  {CALCULATE_OPTIMAL_STRETCH_PATH}\n  Target: KNEE_FLEXOR_K2\n  {ROTATE: +45_DEG}\n  {STIMULATE_SYNAPSE: 22_HZ}\n  {HOLD: 8_SECONDS}\n  {PHYSIO_PATH_FIND}\n</Joint_Path>`,
      solutionCode: `// Rehab-Logic v1.3 - Knee Flexion Protocol\nPatient: Fatima Al-Zahraa (Spastic Knee)\n\n<Neural_Link_Protocol>\n  {SYNC_BRAINWAVE_BETA: 22_HZ}\n  {INHIBIT_SPASM_REFLEX}\n</Neural_Link_Protocol>\n\n<Joint_Path>\n  {CALCULATE_OPTIMAL_STRETCH_PATH}\n  Target: KNEE_FLEXOR_K2\n  {ROTATE: +45_DEG}\n  {STIMULATE_SYNAPSE: 22_HZ}\n  {HOLD: 8_SECONDS}\n  {PHYSIO_PATH_FIND}\n</Joint_Path>`,
      rewardEGP: 1400,
      rewardXP: 280,
      rewardCodex: 35,
      status: 'unscanned',
      currentROM: 25,
      currentPain: 50,
      synapseIntegrity: 20,
      emgSignalQuality: 30
    },
    {
      id: 'p3',
      name: 'عم محمود (أستاذ تاريخ متقاعد)',
      age: 62,
      profession: 'باحث في الآثار المصرية',
      avatar: '📜',
      injury: 'انزلاق غضروفي قطني L4-L5 مع اعتلال عصب النسا',
      bodyPart: 'spine',
      bodyPartLabel: 'الفقرات القطنية L4-L5',
      severity: 'severe',
      description: 'ألم ممتد بالساق اليمنى مع خدر في أصابع القدم. يتطلب فك ضغط الفقرات الدقيق وتيار تبريد كهرومغناطيسي.',
      targetROM: 30,
      painThreshold: 45,
      requiredFrequency: 8,
      defaultCode: `// Rehab-Logic v1.3 - Lumbar Decompression\nPatient: Mahmoud (L4-L5 Herniation)\n\n<Neural_Link_Protocol>\n  {MONITOR_SCIATIC_NERVE}\n  {APPLY_MICRO_TRACTION: 12_KG}\n</Neural_Link_Protocol>\n\n<Joint_Path>\n  Target: LUMBAR_SPINE_L4\n  {DECOMPRESS_AXIAL: 3_MM}\n  {APPLY_FORCE_GENTLY}\n  {NEURAL_HEAL: THETA_8HZ}\n  {HOLD: 10_SECONDS}\n</Joint_Path>`,
      solutionCode: `// Rehab-Logic v1.3 - Lumbar Decompression\nPatient: Mahmoud (L4-L5 Herniation)\n\n<Neural_Link_Protocol>\n  {MONITOR_SCIATIC_NERVE}\n  {APPLY_MICRO_TRACTION: 12_KG}\n</Neural_Link_Protocol>\n\n<Joint_Path>\n  Target: LUMBAR_SPINE_L4\n  {DECOMPRESS_AXIAL: 3_MM}\n  {APPLY_FORCE_GENTLY}\n  {NEURAL_HEAL: THETA_8HZ}\n  {HOLD: 10_SECONDS}\n</Joint_Path>`,
      rewardEGP: 1800,
      rewardXP: 360,
      rewardCodex: 50,
      status: 'unscanned',
      currentROM: 5,
      currentPain: 60,
      synapseIntegrity: 15,
      emgSignalQuality: 22
    },
    {
      id: 'p4',
      name: 'د. سارة (جراحة أوعية دموية)',
      age: 41,
      profession: 'جراحة بمستشفى القصر العيني',
      avatar: '🩺',
      injury: 'تمزق أوتار الكتف والضفيرة العضدية من ساعات العمل الطويلة',
      bodyPart: 'shoulder',
      bodyPartLabel: 'مفصل الكتف الأيمن',
      severity: 'moderate',
      description: 'فقدان جزئي لقوة رفع الذراع واهتزاز في أطراف الأصابع يعيقها عن إجراء العمليات الدقيقة.',
      targetROM: 90,
      painThreshold: 60,
      requiredFrequency: 18,
      defaultCode: `// Rehab-Logic v1.3 - Brachial Plexus Restoration\nPatient: Dr. Sarah (Shoulder Cuff)\n\n<Neural_Link_Protocol>\n  {FILTER_TREMOR_NOISE}\n  {CALCULATE_OPTIMAL_STRETCH_PATH}\n</Neural_Link_Protocol>\n\n<Joint_Path>\n  Target: SHOULDER_ABDUCTOR_S1\n  {ROTATE: +30_DEG}\n  {APPLY_FORCE_GENTLY}\n  {STIMULATE_SYNAPSE: 18_HZ}\n  {HOLD: 6_SECONDS}\n</Joint_Path>`,
      solutionCode: `// Rehab-Logic v1.3 - Brachial Plexus Restoration\nPatient: Dr. Sarah (Shoulder Cuff)\n\n<Neural_Link_Protocol>\n  {FILTER_TREMOR_NOISE}\n  {CALCULATE_OPTIMAL_STRETCH_PATH}\n</Neural_Link_Protocol>\n\n<Joint_Path>\n  Target: SHOULDER_ABDUCTOR_S1\n  {ROTATE: +30_DEG}\n  {APPLY_FORCE_GENTLY}\n  {STIMULATE_SYNAPSE: 18_HZ}\n  {HOLD: 6_SECONDS}\n</Joint_Path>`,
      rewardEGP: 2200,
      rewardXP: 450,
      rewardCodex: 60,
      status: 'unscanned',
      currentROM: 20,
      currentPain: 45,
      synapseIntegrity: 28,
      emgSignalQuality: 35
    }
  ];

  selectedPatient: PatientCase = this.patients[0];

  // Diagnosis State
  currentFrequencySlider = 10;
  frequencyMatchScore = 0;
  isScanningSynapses = false;
  selectedAnatomyZone: string = '';
  scanCompleted = false;

  // IDE State
  currentCode: string = '';
  codeValidationErrors: string[] = [];
  isCodeValid = false;
  isSimulatingCode = false;
  simulationProgress = 0;
  simulationLog: string[] = [];

  // Workshop & Bionics State
  bionicParts: BionicPart[] = [
    {
      id: 'servo_alpha',
      name: 'محرك سيرفو عزم فائق (Torque-X1)',
      type: 'actuator',
      typeLabel: 'محرك حركة',
      level: 2,
      maxLevel: 5,
      icon: '⚙️',
      costEGP: 600,
      precisionBonus: 15,
      speedBonus: 10,
      comfortBonus: 5,
      description: 'محرك ياباني فائق النعومة يتيح زوايا تدوير دقيقة تصل إلى 0.1 درجة لمنع إيذاء المريض.'
    },
    {
      id: 'carbon_chassis',
      name: 'هيكل ألياف الكربون الفضائي',
      type: 'chassis',
      typeLabel: 'هيكل خارجي',
      level: 1,
      maxLevel: 5,
      icon: '🛡️',
      costEGP: 900,
      precisionBonus: 10,
      speedBonus: 20,
      comfortBonus: 15,
      description: 'هيكل خفيف الوزن بصلابة التيتانيوم يقلل الحمل على مفاصل المريض أثناء العلاج الطبيعي.'
    },
    {
      id: 'emg_sensors',
      name: 'حساسات الاستجابة العضلية الكهروضوئية',
      type: 'sensor',
      typeLabel: 'مستشعر حيوي',
      level: 2,
      maxLevel: 5,
      icon: '📡',
      costEGP: 750,
      precisionBonus: 25,
      speedBonus: 5,
      comfortBonus: 20,
      description: 'تقرأ الإشارات العصبية اللحظية وتوقف حركة الروبوت فوراً إذا زاد ألم المريض عن الحد الآمن.'
    },
    {
      id: 'neural_chip',
      name: 'معالج ريهاب-لوجيك الكمي (Codex-N1)',
      type: 'chip',
      typeLabel: 'شريحة معالجة',
      level: 1,
      maxLevel: 5,
      icon: '🧠',
      costEGP: 1200,
      precisionBonus: 30,
      speedBonus: 25,
      comfortBonus: 10,
      description: 'شريحة برمجية تحلل مسارات الحركة بالذكاء الاصطناعي وتولد نبضات شفاء عصبية فورية.'
    }
  ];

  // Treatment Simulation State
  isTreatmentRunning = false;
  treatmentProgress = 0;
  patientHeartRate = 72;
  livePainLevel = 30;
  liveMuscleFlex = 15;
  liveSynapseHealing = 20;
  roboticArmAngle = 0;
  treatmentLogs: string[] = [];
  emergencyStopTriggered = false;
  treatmentSuccessModal = false;

  // Clinic Management & Tycoon
  clinicRooms: ClinicRoom[] = [
    {
      id: 'diag_bay',
      name: 'وحدة الرنين العصبي والـ EMG المتقدمة',
      level: 1,
      maxLevel: 4,
      icon: '🔬',
      costEGP: 1500,
      bonus: '+25% دقة التشخيص وسرعة كشف الإصابات',
      description: 'أجهزة استشعار كهرومغناطيسية تكشف التمزقات المجهرية بدقة الخلايا العصبية.'
    },
    {
      id: 'robotic_bed',
      name: 'سرير العلاج الكهروميكانيكي الذكي',
      level: 2,
      maxLevel: 4,
      icon: '🛏️',
      costEGP: 2200,
      bonus: '+30% راحة المريض و -40% مخاطر الألم',
      description: 'وسائد هوائية ديناميكية تتكيف مع انحناءات العمود الفقري للمريض لحظياً.'
    },
    {
      id: 'codex_server',
      name: 'خادم حوسبة خوارزميات ريهاب-لوجيك',
      level: 1,
      maxLevel: 4,
      icon: '🖥️',
      costEGP: 3000,
      bonus: '+50% نقاط أبحاث الكودكس وتسريع التجميع',
      description: 'مصفوفة خوادم ذكاء اصطناعي تحسب المسارات الحركية المعقدة في أجزاء من الثانية.'
    },
    {
      id: 'sky_garden',
      name: 'حديقة استرخاء المرضى بإطلالة النيل',
      level: 1,
      maxLevel: 3,
      icon: '🌿',
      costEGP: 1800,
      bonus: '+20% مكافآت السمعة (Reputation) وإقبال المرضى',
      description: 'مساحة استشفاء طبيعية تطل على نيل القاهرة والأهرامات لتحسين استجابة الجهاز العصبي.'
    }
  ];

  // Research Tree
  researchNodes: ResearchNode[] = [
    {
      id: 'r1',
      title: 'خوارزمية المسار الحركي التكيفي {PHYSIO_PATH_FIND}',
      branch: 'neural',
      costCodex: 20,
      unlocked: true,
      icon: '🧬',
      effect: 'تسمح للروبوت بتفادي نقاط الألم الشديدة ذاتياً أثناء شد المفاصل.'
    },
    {
      id: 'r2',
      title: 'التحفيز البيولوجي بالتيار الميكروي {NEURAL_HEAL}',
      branch: 'neural',
      costCodex: 35,
      unlocked: false,
      icon: '⚡',
      effect: 'تسريع التئام الأعصاب المقطوعة بنسبة +40% عبر نبضات تردد ثيتا.',
      reqNodeId: 'r1'
    },
    {
      id: 'r3',
      title: 'محركات العزم النيوتني فائق النعومة',
      branch: 'robotics',
      costCodex: 30,
      unlocked: false,
      icon: '🦾',
      effect: 'زيادة أقصى زاوية تدوير آمنة للمفصل بنسبة +25 درجة.',
      reqNodeId: 'r1'
    },
    {
      id: 'r4',
      title: 'أطراف الألياف الحيوية المتكيفة ذاتياً',
      branch: 'materials',
      costCodex: 45,
      unlocked: false,
      icon: '🛡️',
      effect: 'تقليل إجهاد المريض بنسبة 50% وزيادة سرعة التعافي.',
      reqNodeId: 'r3'
    },
    {
      id: 'r5',
      title: 'كودكس القاهرة الشامل للتعافي التام (Codex Prime)',
      branch: 'neural',
      costCodex: 100,
      unlocked: false,
      icon: '👑',
      effect: 'فتح بروتوكولات علاج الشلل الرباعي وإصابات الحبل الشوكي الكاملة.',
      reqNodeId: 'r2'
    }
  ];

  // Dialogue & Story System
  abdullahDialogue = 'مرحباً بك في مختبري بالقاهرة! هنا ندمج الطب الطبيعي مع كود البرمجة والروبوتات لعلاج الحالات المستعصية. اختر مريضاً لنبدأ الفحص!';
  dialogueHistory: string[] = [];

  // Audio System (Web Audio API)
  isMuted = false;
  private audioCtx: AudioContext | null = null;
  private animFrameId: number = 0;

  ngOnInit() {
    this.loadGameData();
    this.currentCode = this.selectedPatient.defaultCode;
    this.dialogueHistory.push(this.abdullahDialogue);
  }

  ngAfterViewInit() {
    this.startClinicRenderLoop();
    this.startEmgRenderLoop();
  }

  ngOnDestroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (_) {}
    }
  }

  // --- Audio Synthesis ---
  private initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol = 0.15) {
    if (this.isMuted) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (_) {}
  }

  playCodeKeySound() {
    this.playTone(400 + Math.random() * 200, 'triangle', 0.04, 0.05);
  }

  playRobotServoSound() {
    this.playTone(220, 'sawtooth', 0.2, 0.08);
    setTimeout(() => this.playTone(330, 'sine', 0.15, 0.06), 80);
  }

  playSuccessSound() {
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 'sine', 0.3, 0.15), idx * 80);
    });
  }

  playAlarmSound() {
    this.playTone(880, 'square', 0.15, 0.2);
    setTimeout(() => this.playTone(700, 'square', 0.2, 0.2), 150);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
  }

  // --- Standard 3 Game Modes (User Rule) ---
  startLocalPlay() {
    this.gameMode = 'local';
    this.gameState = 'PLAYING';
    this.playSuccessSound();
    this.setAbdullahDialogue('تم بدء الجلسة في العيادة المركزية. دعنا نفحص المريض الأول ونبرمج روبوت الشفاء!');
  }

  openRoomModal() {
    this.roomCode = 'CAIRO-' + Math.floor(1000 + Math.random() * 9000);
    this.isHost = true;
    this.connectedPlayers = ['د. عبد الله (المضيف)', 'جهاز استشعار الروبوت (متصل)'];
    this.gameState = 'ROOM_LOBBY';
    this.playTone(520, 'sine', 0.2);
  }

  joinPrivateRoom() {
    if (!this.inputRoomCode.trim()) {
      alert('الرجاء إدخال كود الغرفة المكون من 6 خانات!');
      return;
    }
    this.roomCode = this.inputRoomCode.toUpperCase();
    this.isHost = false;
    this.connectedPlayers = ['المضيف (الغرفة ' + this.roomCode + ')', 'د. عبد الله (الزائر)'];
    this.gameState = 'ROOM_LOBBY';
    this.playTone(600, 'sine', 0.2);
  }

  startRoomGame() {
    this.gameMode = 'p2p';
    this.gameState = 'PLAYING';
    this.playSuccessSound();
    this.setAbdullahDialogue(`تم الاتصال بالغرفة المشتركة [${this.roomCode}]. أنت الآن تشارك التشخيص والبرمجة مع طبيب زميل!`);
  }

  startProMode() {
    this.gameState = 'PRO_MODAL';
    this.playTone(660, 'sine', 0.25);
  }

  confirmProUpgrade() {
    this.isProUser = true;
    this.gameMode = 'pro';
    this.gameState = 'PLAYING';
    this.cairoCredits += 5000;
    this.codexFragments += 100;
    this.playSuccessSound();
    this.setAbdullahDialogue('🏆 مرحباً بك في وضع المحترفين Pro Mode! تم فتح حالات الطوارئ العصبية المعقدة ولوحة الصدارة العالمية.');
  }

  backToMenu() {
    this.gameState = 'MENU';
    this.isTreatmentRunning = false;
  }

  exitToArcade() {
    this.router.navigate(['/arcade']);
  }

  // --- Dialogue ---
  setAbdullahDialogue(msg: string) {
    this.abdullahDialogue = msg;
    this.dialogueHistory.unshift(msg);
    if (this.dialogueHistory.length > 8) this.dialogueHistory.pop();
    this.playTone(440, 'triangle', 0.08, 0.1);
  }

  // --- Tab Navigation ---
  selectTab(tab: 'cases' | 'diagnosis' | 'ide' | 'workshop' | 'treatment' | 'management' | 'research') {
    this.activeTab = tab;
    this.playTone(350, 'sine', 0.08, 0.08);
  }

  // --- Patient Selection & Diagnosis ---
  selectPatient(p: PatientCase) {
    this.selectedPatient = p;
    this.currentCode = p.defaultCode;
    this.scanCompleted = p.status !== 'unscanned';
    this.frequencyMatchScore = p.status !== 'unscanned' ? 100 : 0;
    this.currentFrequencySlider = 10;
    this.setAbdullahDialogue(`تم فتح ملف المريض: ${p.name}. الإصابة: ${p.injury}. دعنا نفحص الإشارة العصبية.`);
    this.selectTab('diagnosis');
  }

  onFrequencyChange(val: number) {
    this.currentFrequencySlider = Number(val);
    const diff = Math.abs(this.currentFrequencySlider - this.selectedPatient.requiredFrequency);
    this.frequencyMatchScore = Math.max(0, Math.round(100 - diff * 12));
    this.playTone(150 + this.currentFrequencySlider * 25, 'sine', 0.05, 0.04);
  }

  runDiagnosticScan() {
    if (this.frequencyMatchScore < 85) {
      this.playAlarmSound();
      this.setAbdullahDialogue('⚠️ إشارة التردد غير متطابقة بدقة! حرك مؤشر التردد حتى يتطابق مع النبضة العصبية المستهدفة (أخضر).');
      return;
    }

    this.isScanningSynapses = true;
    this.playTone(550, 'sawtooth', 0.4, 0.1);

    setTimeout(() => {
      this.isScanningSynapses = false;
      this.scanCompleted = true;
      this.selectedPatient.status = 'diagnosed';
      this.selectedPatient.emgSignalQuality = 88;
      this.selectedPatient.synapseIntegrity = 50;
      this.playSuccessSound();
      this.setAbdullahDialogue(`✅ اكتمل الفحص العصبي بنجاح! تم تحديد موقع التمزق العصبي في ${this.selectedPatient.bodyPartLabel}. انتقل لمحرر الكود لبرمجة مسار الروبوت.`);
      this.saveGameData();
    }, 1200);
  }

  // --- Rehab-Logic IDE & Simulator ---
  insertCodeSnippet(snippet: string) {
    this.currentCode += '\n' + snippet;
    this.playCodeKeySound();
  }

  compileAndVerifyCode() {
    this.codeValidationErrors = [];
    this.isCodeValid = false;

    if (!this.currentCode.includes('<Neural_Link_Protocol>') || !this.currentCode.includes('</Neural_Link_Protocol>')) {
      this.codeValidationErrors.push('خطأ: بروتوكول الرابط العصبي <Neural_Link_Protocol> غير مغلق بشكل صحيح.');
    }
    if (!this.currentCode.includes('<Joint_Path>') || !this.currentCode.includes('</Joint_Path>')) {
      this.codeValidationErrors.push('خطأ: مسار حركة المفصل <Joint_Path> مفقود أو غير معرف.');
    }
    if (!this.currentCode.includes('Target:')) {
      this.codeValidationErrors.push('تحذير: لم يتم تحديد المفصل المستهدف (Target Joint).');
    }
    if (!this.currentCode.includes('ROTATE:') && !this.currentCode.includes('DECOMPRESS_AXIAL:')) {
      this.codeValidationErrors.push('خطأ: لم يتم تحديد زاوية حركة ميكانيكية للروبوت (مثل {ROTATE: +15_DEG}).');
    }

    if (this.codeValidationErrors.length === 0) {
      this.isCodeValid = true;
      this.selectedPatient.status = 'coded';
      this.selectedPatient.defaultCode = this.currentCode;
      this.playSuccessSound();
      this.setAbdullahDialogue('🌟 تم ترجمة كود ريهاب-لوجيك v1.3 بنجاح ودون أخطاء أمان! الروبوت جاهز لبدء جلسة العلاج الطبيعي.');
      this.saveGameData();
    } else {
      this.playAlarmSound();
      this.setAbdullahDialogue('❌ توجد أخطاء في كود ريهاب-لوجيك! راجع رسائل الخطأ لتصحيح البروتوكول.');
    }
  }

  runCodeSimulation() {
    if (!this.isCodeValid) {
      this.compileAndVerifyCode();
      if (!this.isCodeValid) return;
    }

    this.isSimulatingCode = true;
    this.simulationProgress = 0;
    this.simulationLog = ['> جاري فحص استجابة الحساسات...', '> تشغيل محاكاة العزم الميكانيكي...'];
    this.playRobotServoSound();

    const interval = setInterval(() => {
      this.simulationProgress += 20;
      if (this.simulationProgress === 40) {
        this.simulationLog.push('> تم فحص عتبة الألم: آمن تماماً (تحت 60%).');
      } else if (this.simulationProgress === 80) {
        this.simulationLog.push('> توليد مسار الشد السلس {PHYSIO_PATH_FIND}: تم بنجاح.');
      } else if (this.simulationProgress >= 100) {
        clearInterval(interval);
        this.isSimulatingCode = false;
        this.simulationLog.push('> ✅ المحاكاة نجحت بنسبة 100%! انتقل لغرفة العلاج.');
        this.playSuccessSound();
      }
    }, 300);
  }

  // --- Biomechanical Workshop ---
  upgradeBionicPart(part: BionicPart) {
    if (part.level >= part.maxLevel) return;
    if (this.cairoCredits < part.costEGP) {
      this.playAlarmSound();
      alert('رصيد الجنيه غير كافٍ لترقية هذه القطعة!');
      return;
    }

    this.cairoCredits -= part.costEGP;
    part.level++;
    part.costEGP = Math.round(part.costEGP * 1.6);
    part.precisionBonus += 10;
    part.speedBonus += 8;
    part.comfortBonus += 6;
    this.playSuccessSound();
    this.setAbdullahDialogue(`🔧 تم ترقية ${part.name} إلى المستوى ${part.level}! زادت دقة ذراع الروبوت.`);
    this.saveGameData();
  }

  // --- Treatment Session Simulation ---
  startLiveTreatment() {
    if (this.selectedPatient.status === 'unscanned') {
      alert('يجب تشخيص المريض أولاً في معمل التشخيص العصبي!');
      this.selectTab('diagnosis');
      return;
    }
    if (!this.isCodeValid && this.selectedPatient.status !== 'coded') {
      alert('يجب كتابة والتحقق من كود ريهاب-لوجيك أولاً!');
      this.selectTab('ide');
      return;
    }

    this.isTreatmentRunning = true;
    this.emergencyStopTriggered = false;
    this.treatmentProgress = 0;
    this.treatmentLogs = ['⚡ بدء تشغيل الروبوت Synapse-3000...', '📡 الاتصال بالحساسات العصبية للمريض...'];
    this.playRobotServoSound();
    this.setAbdullahDialogue('بدأت جلسة العلاج الآلي الحي. راقب مؤشر الألم ونبضات القلب بعناية!');

    const treatInterval = setInterval(() => {
      if (!this.isTreatmentRunning || this.emergencyStopTriggered) {
        clearInterval(treatInterval);
        return;
      }

      this.treatmentProgress += 5;
      this.roboticArmAngle = Math.sin(this.treatmentProgress * 0.1) * 35;
      this.patientHeartRate = 72 + Math.round(Math.sin(this.treatmentProgress * 0.2) * 8);
      this.livePainLevel = Math.max(10, Math.min(this.selectedPatient.painThreshold - 10, 25 + Math.round(Math.sin(this.treatmentProgress * 0.15) * 20)));
      this.liveMuscleFlex = Math.min(100, 20 + Math.round(this.treatmentProgress * 0.8));
      this.liveSynapseHealing = Math.min(100, 30 + Math.round(this.treatmentProgress * 0.7));

      if (this.treatmentProgress % 20 === 0) {
        this.playRobotServoSound();
        this.treatmentLogs.push(`> زاوية المفصل: ${Math.round(this.roboticArmAngle)}° | معدل الشفاء: ${this.liveSynapseHealing}%`);
      }

      // Check Pain Limit
      if (this.livePainLevel >= this.selectedPatient.painThreshold) {
        this.playAlarmSound();
        this.treatmentLogs.push('⚠️ تنبيه: اقتراب الألم من الحد الحرج! قم بالتدخل المهدئ {GENTLE_PULSE}!');
      }

      if (this.treatmentProgress >= 100) {
        clearInterval(treatInterval);
        this.isTreatmentRunning = false;
        this.completeTreatmentSuccess();
      }
    }, 400);
  }

  triggerGentlePulse() {
    this.livePainLevel = Math.max(5, this.livePainLevel - 18);
    this.patientHeartRate = Math.max(65, this.patientHeartRate - 5);
    this.treatmentLogs.push('✨ نبضة تبريد مهدئة تم إرسالها! انخفض مستوى الألم فوراً.');
    this.playTone(600, 'sine', 0.2, 0.1);
  }

  triggerServoCalibrate() {
    this.liveMuscleFlex = Math.min(100, this.liveMuscleFlex + 15);
    this.treatmentLogs.push('⚙️ تمت موازنة عزم السيرفو بدقة 0.05 مم.');
    this.playTone(400, 'triangle', 0.15, 0.1);
  }

  triggerEmergencyStop() {
    this.emergencyStopTriggered = true;
    this.isTreatmentRunning = false;
    this.playAlarmSound();
    this.treatmentLogs.push('🛑 تم إيقاف الطوارئ فوراً وفصل الروبوت بسلام.');
    this.setAbdullahDialogue('تم إيقاف الروبوت بحماية كاملة للمريض. يمكنك إعادة الضبط والبدء مجدداً.');
  }

  completeTreatmentSuccess() {
    this.selectedPatient.status = 'cured';
    this.selectedPatient.currentROM = this.selectedPatient.targetROM;
    this.selectedPatient.currentPain = 0;
    this.selectedPatient.synapseIntegrity = 100;
    this.selectedPatient.emgSignalQuality = 100;
    this.curedPatientsCount++;

    this.cairoCredits += this.selectedPatient.rewardEGP;
    this.clinicXP += this.selectedPatient.rewardXP;
    this.codexFragments += this.selectedPatient.rewardCodex;
    this.reputationStars = Math.min(5.0, Number((this.reputationStars + 0.05).toFixed(2)));

    this.treatmentSuccessModal = true;
    this.playSuccessSound();
    this.setAbdullahDialogue(`🎉 مبروك! تعافى المريض ${this.selectedPatient.name} تماماً بفضل خوارزمية ريهاب-لوجيك! حصلت على ${this.selectedPatient.rewardEGP} ج.م و ${this.selectedPatient.rewardCodex} نقاط كودكس.`);
    this.saveGameData();
  }

  closeSuccessModal() {
    this.treatmentSuccessModal = false;
    this.selectTab('cases');
  }

  // --- Clinic Management ---
  upgradeClinicRoom(room: ClinicRoom) {
    if (room.level >= room.maxLevel) return;
    if (this.cairoCredits < room.costEGP) {
      this.playAlarmSound();
      alert('رصيد الجنيه غير كافٍ لترقية هذه الغرفة!');
      return;
    }

    this.cairoCredits -= room.costEGP;
    room.level++;
    room.costEGP = Math.round(room.costEGP * 1.8);
    this.reputationStars = Math.min(5.0, Number((this.reputationStars + 0.1).toFixed(2)));
    this.playSuccessSound();
    this.setAbdullahDialogue(`🏥 تم ترقية ${room.name} للمستوى ${room.level}! ارتفعت كفاءة العيادة وسمعتها.`);
    this.saveGameData();
  }

  // --- Research Tree ---
  unlockResearch(node: ResearchNode) {
    if (node.unlocked) return;
    if (node.reqNodeId) {
      const parent = this.researchNodes.find(n => n.id === node.reqNodeId);
      if (parent && !parent.unlocked) {
        alert('يجب فتح البحث السابق أولاً!');
        return;
      }
    }
    if (this.codexFragments < node.costCodex) {
      this.playAlarmSound();
      alert('نقاط الكودكس (Codex Fragments) غير كافية لفك تشفير هذا البحث!');
      return;
    }

    this.codexFragments -= node.costCodex;
    node.unlocked = true;
    this.playSuccessSound();
    this.setAbdullahDialogue(`🧬 تم فك تشفير خوارزمية جديدة: ${node.title}! أصبحت العيادة أكثر تقدماً.`);
    this.saveGameData();
  }

  // --- Cairo Isometric Canvas Renderer ---
  private startClinicRenderLoop() {
    const canvas = this.clinicCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // 1. Cairo Skyline Backdrop (Nile, Cairo Tower, Neon Pyramids, Minarets, Sunset Gradient)
      const grad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
      if (this.timeOfDay === 'sunset') {
        grad.addColorStop(0, '#f97316');
        grad.addColorStop(0.4, '#a855f7');
        grad.addColorStop(1, '#0f172a');
      } else if (this.timeOfDay === 'night') {
        grad.addColorStop(0, '#090d16');
        grad.addColorStop(0.6, '#1e1b4b');
        grad.addColorStop(1, '#020617');
      } else {
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.7, '#fed7aa');
        grad.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h * 0.55);

      // Cairo Pyramids Silhouette (Neon-Glow edges)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.moveTo(w * 0.65, h * 0.45);
      ctx.lineTo(w * 0.78, h * 0.28);
      ctx.lineTo(w * 0.91, h * 0.45);
      ctx.fill();

      // Neon Pyramid Hologram Capstone
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.78, h * 0.28);
      ctx.lineTo(w * 0.75, h * 0.33);
      ctx.lineTo(w * 0.81, h * 0.33);
      ctx.closePath();
      ctx.stroke();

      // Cairo Minarets & Tower
      ctx.fillRect(w * 0.2, h * 0.32, 12, h * 0.13);
      ctx.beginPath();
      ctx.arc(w * 0.2 + 6, h * 0.32, 8, 0, Math.PI, true);
      ctx.fill();

      // Cairo Tower Silhouette
      ctx.fillRect(w * 0.48, h * 0.22, 16, h * 0.23);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(w * 0.48 + 5, h * 0.20, 6, 8); // Top beacon

      // River Nile Shimmer
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, h * 0.45, w, h * 0.1);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
      for (let i = 0; i < 6; i++) {
        const nx = ((time * 40 + i * 120) % w);
        ctx.fillRect(nx, h * 0.48 + (i % 3) * 6, 40, 2);
      }

      // 2. High-Tech Isometric Clinic Lab Floor & Grid
      const floorGrad = ctx.createLinearGradient(0, h * 0.52, 0, h);
      floorGrad.addColorStop(0, '#0f172a');
      floorGrad.addColorStop(0.5, '#1e293b');
      floorGrad.addColorStop(1, '#020617');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, h * 0.52, w, h * 0.48);

      // Cyber Grid Lines (Isometric Perspective)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, h * 0.55);
        ctx.lineTo(x + (x - w / 2) * 0.8, h);
        ctx.stroke();
      }
      for (let y = h * 0.55; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 3. Treatment Pod Bed (Right Side)
      const bedX = w * 0.62;
      const bedY = h * 0.65;
      ctx.fillStyle = '#334155';
      ctx.fillRect(bedX, bedY, 180, 50);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bedX + 10, bedY - 12, 160, 14); // Mattress

      // Patient on bed
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(bedX + 30, bedY - 26, 110, 16); // Body
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(bedX + 130, bedY - 22, 10, 0, Math.PI * 2); // Head
      ctx.fill();

      // 4. Robotic Multi-Joint Arm (Above Treatment Bed)
      const baseArmX = w * 0.78;
      const baseArmY = h * 0.52;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(baseArmX - 15, baseArmY - 20, 30, 20); // Ceiling mount

      const joint1X = baseArmX + Math.sin(time * 0.8) * 15;
      const joint1Y = baseArmY + 45;
      const joint2X = joint1X - 25 + Math.sin(time * 1.2) * 12;
      const joint2Y = joint1Y + 45;

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(baseArmX, baseArmY);
      ctx.lineTo(joint1X, joint1Y);
      ctx.lineTo(joint2X, joint2Y);
      ctx.stroke();

      // Joints
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(joint1X, joint1Y, 6, 0, Math.PI * 2);
      ctx.arc(joint2X, joint2Y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Laser Scanner Beam onto patient
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.beginPath();
      ctx.moveTo(joint2X, joint2Y);
      ctx.lineTo(bedX + 40, bedY - 12);
      ctx.lineTo(bedX + 100, bedY - 12);
      ctx.closePath();
      ctx.fill();

      // 5. Dr. Abdullah at Workstation (Left Side)
      const docX = w * 0.25;
      const docY = h * 0.68;

      // Workstation Desk & Holographic Monitor
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(docX - 60, docY + 15, 120, 45);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(docX - 50, docY - 45, 100, 55); // Hologram Screen
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(docX - 50, docY - 45, 100, 55);

      // Data Lines on Screen
      ctx.fillStyle = '#38bdf8';
      for (let l = 0; l < 4; l++) {
        ctx.fillRect(docX - 42, docY - 38 + l * 10, 40 + Math.sin(time + l) * 25, 3);
      }

      // Dr. Abdullah Character (Dark skin, glasses, code lab coat)
      ctx.fillStyle = '#475569'; // Pants
      ctx.fillRect(docX - 12, docY + 10, 24, 30);

      // Code Patterned Lab Coat
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(docX - 16, docY - 20, 32, 32);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(docX - 14, docY - 16, 6, 24); // Blue code stripe

      // Head & AR Glasses
      ctx.fillStyle = '#8d5b4c'; // Dark skin tone
      ctx.beginPath();
      ctx.arc(docX, docY - 32, 12, 0, Math.PI * 2);
      ctx.fill();

      // Short Black Hair
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(docX, docY - 35, 12, Math.PI, Math.PI * 2);
      ctx.fill();

      // Smart AR HUD Glasses (Glowing Cyan)
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(docX + 2, docY - 35, 10, 5);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.strokeRect(docX + 2, docY - 35, 10, 5);

      this.animFrameId = requestAnimationFrame(render);
    };

    render();
  }

  // --- EMG & Neural Waveform Oscilloscope Renderer ---
  private startEmgRenderLoop() {
    const canvas = this.emgCanvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let emgPhase = 0;

    const renderEMG = () => {
      emgPhase += 0.05;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // Oscilloscope Grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Target Waveform (Gold)
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const targetFreq = this.selectedPatient.requiredFrequency * 0.15;
        const y = h / 2 + Math.sin(x * targetFreq + emgPhase) * 28;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Current Tuned Waveform (Neon Green/Cyan)
      const userFreq = this.currentFrequencySlider * 0.15;
      ctx.strokeStyle = this.frequencyMatchScore > 80 ? '#10b981' : '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const noise = (Math.random() - 0.5) * (100 - this.frequencyMatchScore) * 0.2;
        const y = h / 2 + Math.sin(x * userFreq + emgPhase) * 28 + noise;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      requestAnimationFrame(renderEMG);
    };

    renderEMG();
  }

  // --- Storage & Persistence ---
  private saveGameData() {
    try {
      const data = {
        credits: this.cairoCredits,
        xp: this.clinicXP,
        level: this.clinicLevel,
        stars: this.reputationStars,
        codex: this.codexFragments,
        curedCount: this.curedPatientsCount,
        patients: this.patients.map(p => ({ id: p.id, status: p.status, rom: p.currentROM })),
        bionicParts: this.bionicParts.map(b => ({ id: b.id, level: b.level })),
        rooms: this.clinicRooms.map(r => ({ id: r.id, level: r.level })),
        research: this.researchNodes.map(r => ({ id: r.id, unlocked: r.unlocked }))
      };
      localStorage.setItem('neuro_physio_codex_save', JSON.stringify(data));
    } catch (_) {}
  }

  private loadGameData() {
    try {
      const saved = localStorage.getItem('neuro_physio_codex_save');
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data.credits !== undefined) this.cairoCredits = data.credits;
      if (data.xp !== undefined) this.clinicXP = data.xp;
      if (data.level !== undefined) this.clinicLevel = data.level;
      if (data.stars !== undefined) this.reputationStars = data.stars;
      if (data.codex !== undefined) this.codexFragments = data.codex;
      if (data.curedCount !== undefined) this.curedPatientsCount = data.curedCount;

      if (data.patients && Array.isArray(data.patients)) {
        data.patients.forEach((sp: any) => {
          const p = this.patients.find(item => item.id === sp.id);
          if (p) {
            p.status = sp.status;
            if (sp.rom) p.currentROM = sp.rom;
          }
        });
      }

      if (data.bionicParts && Array.isArray(data.bionicParts)) {
        data.bionicParts.forEach((sb: any) => {
          const b = this.bionicParts.find(item => item.id === sb.id);
          if (b) b.level = sb.level;
        });
      }

      if (data.rooms && Array.isArray(data.rooms)) {
        data.rooms.forEach((sr: any) => {
          const r = this.clinicRooms.find(item => item.id === sr.id);
          if (r) r.level = sr.level;
        });
      }

      if (data.research && Array.isArray(data.research)) {
        data.research.forEach((sres: any) => {
          const r = this.researchNodes.find(item => item.id === sres.id);
          if (r) r.unlocked = sres.unlocked;
        });
      }
    } catch (_) {}
  }
}
