import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@UseGuards(CombinedAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search files and folders' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'type', required: false, enum: ['files', 'folders', 'all'] })
  @ApiQuery({ name: 'extension', required: false })
  @ApiQuery({ name: 'mimeType', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'sizeMin', required: false })
  @ApiQuery({ name: 'sizeMax', required: false })
  search(@CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole, @Query() query: any) {
    return this.searchService.search(userId, role, query);
  }
}
