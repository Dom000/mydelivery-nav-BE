import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const DecodedToken = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    // Passport places the decoded JWT payload on `request.user` after JwtStrategy validation
    if (req && req.user) return req.user;
    return null;
  },
);
