import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  OperationType,
  handleFirestoreError,
  User
} from './firebase';
import { 
  Layout, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  LogOut, 
  LogIn, 
  Folder, 
  ListTodo,
  User as UserIcon,
  ChevronRight,
  Calendar,
  MoreVertical,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  createdAt: any;
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  deadline: any;
  priority: 'low' | 'medium' | 'high';
  status: 'To Do' | 'In Progress' | 'Done';
  assignedTo?: string;
  ownerId: string;
  createdAt: any;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'admin' | 'user';
}

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }: any) => {
  const variants: any = {
    primary: 'bg-black text-white hover:bg-zinc-800',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    outline: 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
  };
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = 'text', required = false }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>}
    <input 
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
    />
  </div>
);

const Select = ({ label, value, onChange, options }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>}
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all appearance-none"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: any) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="px-6 py-4 border-bottom border-zinc-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <X size={20} className="text-zinc-500" />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // Modal states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Form states
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskStatus, setTaskStatus] = useState<'To Do' | 'In Progress' | 'Done'>('To Do');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch or create user profile
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: u.uid,
            displayName: u.displayName || 'User',
            email: u.email || '',
            photoURL: u.photoURL || '',
            role: 'user'
          };
          await setDoc(doc(db, 'users', u.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setTasks([]);
      return;
    }

    // Real-time projects
    const qProjects = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));

    // Real-time tasks
    const qTasks = query(collection(db, 'tasks'), where('ownerId', '==', user.uid));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));

    return () => {
      unsubProjects();
      unsubTasks();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const projectData = {
        title: projectTitle,
        description: projectDesc,
        ownerId: user.uid,
        createdAt: Timestamp.now()
      };

      if (editingProject) {
        await updateDoc(doc(db, 'projects', editingProject.id), projectData);
      } else {
        await addDoc(collection(db, 'projects'), projectData);
      }

      setIsProjectModalOpen(false);
      setEditingProject(null);
      setProjectTitle('');
      setProjectDesc('');
    } catch (err) {
      handleFirestoreError(err, editingProject ? OperationType.UPDATE : OperationType.CREATE, 'projects');
    }
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProjectId) return;

    try {
      const taskData = {
        projectId: selectedProjectId,
        title: taskTitle,
        description: taskDesc,
        deadline: taskDeadline ? Timestamp.fromDate(new Date(taskDeadline)) : null,
        priority: taskPriority,
        status: taskStatus,
        ownerId: user.uid,
        createdAt: editingTask ? editingTask.createdAt : Timestamp.now()
      };

      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
      } else {
        await addDoc(collection(db, 'tasks'), taskData);
      }

      setIsTaskModalOpen(false);
      setEditingTask(null);
      setTaskTitle('');
      setTaskDesc('');
      setTaskDeadline('');
      setTaskPriority('medium');
      setTaskStatus('To Do');
    } catch (err) {
      handleFirestoreError(err, editingTask ? OperationType.UPDATE : OperationType.CREATE, 'tasks');
    }
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'tasks');
    }
  };

  const deleteProject = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project and all its tasks?")) return;
    try {
      // Delete tasks first
      const projectTasks = tasks.filter(t => t.projectId === id);
      for (const t of projectTasks) {
        await deleteDoc(doc(db, 'tasks', t.id));
      }
      await deleteDoc(doc(db, 'projects', id));
      if (selectedProjectId === id) setSelectedProjectId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'projects');
    }
  };

  const openEditProject = (p: Project) => {
    setEditingProject(p);
    setProjectTitle(p.title);
    setProjectDesc(p.description);
    setIsProjectModalOpen(true);
  };

  const openEditTask = (t: Task) => {
    setEditingTask(t);
    setTaskTitle(t.title);
    setTaskDesc(t.description);
    setTaskDeadline(t.deadline ? new Date(t.deadline.seconds * 1000).toISOString().split('T')[0] : '');
    setTaskPriority(t.priority);
    setTaskStatus(t.status);
    setIsTaskModalOpen(true);
  };

  const filteredTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter(t => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-4 border-zinc-200 border-t-black rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white p-10 rounded-[40px] shadow-xl border border-zinc-100 text-center"
        >
          <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Layout className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 mb-4 tracking-tight">Task Tracker</h1>
          <p className="text-zinc-500 mb-10 leading-relaxed">Manage your projects and tasks with precision. Real-time updates, secure access, and elegant design.</p>
          <Button onClick={handleLogin} className="w-full py-4 text-lg rounded-2xl">
            <LogIn size={20} />
            Sign in with Google
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-md">
              <Layout className="text-white" size={20} />
            </div>
            <span className="font-black text-xl tracking-tight">Tracker</span>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-all">
            <LogOut size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <div className="flex items-center justify-between px-2 mb-4">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Projects</h2>
              <button 
                onClick={() => { setEditingProject(null); setProjectTitle(''); setProjectDesc(''); setIsProjectModalOpen(true); }}
                className="p-1.5 hover:bg-zinc-100 rounded-md transition-colors text-zinc-600"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="space-y-1">
              {projects.length === 0 ? (
                <div className="px-4 py-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                  <Folder className="mx-auto text-zinc-300 mb-2" size={24} />
                  <p className="text-xs text-zinc-400 font-medium">No projects yet</p>
                </div>
              ) : (
                projects.map(p => (
                  <div 
                    key={p.id}
                    className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${selectedProjectId === p.id ? 'bg-black text-white shadow-lg' : 'hover:bg-zinc-100 text-zinc-600'}`}
                    onClick={() => setSelectedProjectId(p.id)}
                  >
                    <Folder size={18} className={selectedProjectId === p.id ? 'text-white/70' : 'text-zinc-400'} />
                    <span className="font-semibold truncate flex-1">{p.title}</span>
                    <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${selectedProjectId === p.id ? 'text-white' : 'text-zinc-400'}`}>
                      <button onClick={(e) => { e.stopPropagation(); openEditProject(p); }} className="p-1 hover:bg-white/20 rounded">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }} className="p-1 hover:bg-red-500/20 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <img src={profile?.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-zinc-900 truncate">{profile?.displayName}</p>
              <p className="text-xs text-zinc-500 truncate">{profile?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {selectedProjectId ? (
          <>
            <header className="px-8 py-6 bg-white border-b border-zinc-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">
                  <span>Projects</span>
                  <ChevronRight size={12} />
                  <span className="text-black">{activeProject?.title}</span>
                </div>
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">{activeProject?.title}</h1>
                <p className="text-zinc-500 text-sm mt-1">{activeProject?.description}</p>
              </div>
              <Button onClick={() => { setEditingTask(null); setTaskTitle(''); setTaskDesc(''); setTaskDeadline(''); setTaskPriority('medium'); setTaskStatus('To Do'); setIsTaskModalOpen(true); }}>
                <Plus size={20} />
                New Task
              </Button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {['To Do', 'In Progress', 'Done'].map(status => (
                  <div key={status} className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status === 'To Do' ? 'bg-zinc-400' : status === 'In Progress' ? 'bg-blue-500' : 'bg-green-500'}`} />
                        <h3 className="text-sm font-bold text-zinc-900">{status}</h3>
                        <span className="px-2 py-0.5 bg-zinc-200 text-zinc-600 rounded-full text-[10px] font-bold">
                          {filteredTasks.filter(t => t.status === status).length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {filteredTasks.filter(t => t.status === status).map(task => (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={task.id}
                          className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200 group hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              task.priority === 'high' ? 'bg-red-50 text-red-600' : 
                              task.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 
                              'bg-green-50 text-green-600'
                            }`}>
                              {task.priority}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditTask(task)} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => deleteTask(task.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <h4 className="font-bold text-zinc-900 mb-1 leading-tight">{task.title}</h4>
                          <p className="text-zinc-500 text-xs line-clamp-2 mb-4">{task.description}</p>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              <Calendar size={12} />
                              <span className="text-[10px] font-bold">
                                {task.deadline ? new Date(task.deadline.seconds * 1000).toLocaleDateString() : 'No deadline'}
                              </span>
                            </div>
                            <div className="flex -space-x-2">
                              <img src={profile?.photoURL} alt="" className="w-6 h-6 rounded-full border-2 border-white ring-1 ring-zinc-100" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      
                      {filteredTasks.filter(t => t.status === status).length === 0 && (
                        <div className="py-12 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center text-zinc-300">
                          <ListTodo size={32} strokeWidth={1.5} />
                          <p className="text-xs font-bold mt-2">No tasks</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 bg-zinc-100 rounded-[32px] flex items-center justify-center mb-8 text-zinc-300">
              <Folder size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight mb-2">Select a project</h2>
            <p className="text-zinc-500 max-w-xs mx-auto">Choose a project from the sidebar or create a new one to start tracking your progress.</p>
            <Button 
              variant="secondary" 
              className="mt-8 px-8 py-3 rounded-2xl"
              onClick={() => { setEditingProject(null); setProjectTitle(''); setProjectDesc(''); setIsProjectModalOpen(true); }}
            >
              <Plus size={20} />
              Create your first project
            </Button>
          </div>
        )}
      </main>

      {/* Modals */}
      <Modal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        title={editingProject ? 'Edit Project' : 'New Project'}
      >
        <form onSubmit={saveProject} className="space-y-6">
          <Input 
            label="Project Title" 
            value={projectTitle} 
            onChange={setProjectTitle} 
            placeholder="e.g. Website Redesign" 
            required 
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</label>
            <textarea 
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              placeholder="What is this project about?"
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all h-24 resize-none"
            />
          </div>
          <Button type="submit" className="w-full py-3.5 rounded-2xl">
            {editingProject ? 'Save Changes' : 'Create Project'}
          </Button>
        </form>
      </Modal>

      <Modal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        title={editingTask ? 'Edit Task' : 'New Task'}
      >
        <form onSubmit={saveTask} className="space-y-6">
          <Input 
            label="Task Title" 
            value={taskTitle} 
            onChange={setTaskTitle} 
            placeholder="e.g. Design homepage" 
            required 
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</label>
            <textarea 
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              placeholder="Task details..."
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all h-24 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Deadline" 
              type="date" 
              value={taskDeadline} 
              onChange={setTaskDeadline} 
            />
            <Select 
              label="Priority" 
              value={taskPriority} 
              onChange={setTaskPriority} 
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' }
              ]} 
            />
          </div>
          <Select 
            label="Status" 
            value={taskStatus} 
            onChange={setTaskStatus} 
            options={[
              { value: 'To Do', label: 'To Do' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Done', label: 'Done' }
            ]} 
          />
          <Button type="submit" className="w-full py-3.5 rounded-2xl">
            {editingTask ? 'Save Changes' : 'Create Task'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
