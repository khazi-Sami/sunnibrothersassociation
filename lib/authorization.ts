export type SecurityUser = { id: string; role: "ADMIN" | "TEACHER" | "STUDENT"; teacherStatus?: "ACTIVE" | "PENDING" | "INACTIVE" | null };

export function isAdmin(user: SecurityUser | null | undefined) { return user?.role === "ADMIN"; }
export function isActiveTeacher(user: SecurityUser | null | undefined) { return user?.role === "TEACHER" && user.teacherStatus === "ACTIVE"; }
export function canTeach(user: SecurityUser | null | undefined) { return isAdmin(user) || isActiveTeacher(user); }
export function ownsCourse(user: SecurityUser | null | undefined, course: { teacherId: string } | null | undefined) { return Boolean(user && course && (isAdmin(user) || (isActiveTeacher(user) && course.teacherId === user.id))); }
export function ownsClass(user: SecurityUser | null | undefined, klass: { teacherId: string } | null | undefined) { return Boolean(user && klass && (isAdmin(user) || (isActiveTeacher(user) && klass.teacherId === user.id))); }
export function canAccessRecording(user: SecurityUser | null | undefined, relation: { teacherId: string; enrolledStudentIds: string[] } | null | undefined) { return Boolean(user && relation && (isAdmin(user) || (user.role === "TEACHER" && isActiveTeacher(user) && relation.teacherId === user.id) || (user.role === "STUDENT" && relation.enrolledStudentIds.includes(user.id)))); }
