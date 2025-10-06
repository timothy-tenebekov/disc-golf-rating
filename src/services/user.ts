export default class User {
    static readonly PERMISSION_EDIT = 0;
    static readonly PERMISSION_DECLINE = 1;
    static readonly PERMISSION_ASSIGN = 2;
    static readonly PERMISSION_ACCEPT = 3;
    static readonly PERMISSION_POSITION = 4;
    static readonly PERMISSION_PATCH = 5;
    static readonly PERMISSION_SUPER_ASSIGN = 6;
    static readonly PERMISSION_VIEW = 7;
    static readonly PERMISSION_DESCRIBE = 8;
    static readonly PERMISSION_DEVELOPER = 9;
    static readonly PERMISSION_MANAGE_USERS = 10;
    static readonly PERMISSION_LEAD_DEVELOPER = 11;
    static readonly PERMISSION_MECHANIC_CREATE = 12;
    static readonly PERMISSION_MECHANIC_UPDATE = 13;

    private readonly id: number;
    private readonly permissions: number;

    constructor(id: number, permissions: number) {
        this.id = id;
        this.permissions = permissions;
    }

    public getId(): number {
        return this.id;
    }

    public checkPermission(permission: number): boolean {
        return User.checkPermission(this.permissions, permission);
    }

    public static checkPermission(permissions: number, permission: number): boolean {
        return (permissions & (1 << permission)) !== 0;
    }
}
