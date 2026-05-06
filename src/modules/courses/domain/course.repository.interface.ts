export interface ICourseRepository {
  findAll(): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  findByProfessor(professorId: string): Promise<any[]>;
  create(data: {
    name: string;
    code: string;
    period: string;
    group: string;
    professorId: string;
  }): Promise<any>;
  update(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      period: string;
      group: string;
    }>,
  ): Promise<any>;
  delete(id: string): Promise<void>;
  enrollStudent(courseId: string, studentId: string): Promise<void>;
  unenrollStudent(courseId: string, studentId: string): Promise<void>;
  isStudentEnrolled(courseId: string, studentId: string): Promise<boolean>;
}

export const COURSE_REPOSITORY = Symbol('COURSE_REPOSITORY');
